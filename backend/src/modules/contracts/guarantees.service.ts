import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { AuditAction } from '../../common/constants/enums';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { formatMoney, roundMoney } from '../../common/utils/money.util';
import { AUDIT_MODULES } from '../audit/audit.constants';
import { AuditService } from '../audit/audit.service';
import { Contract } from '../payments/entities/contract.entity';
import { ContractsService, ContractView } from './contracts.service';
import { GuaranteeMatch, GuaranteeValues, matchGuarantee } from './domain/guarantee-match';
import { CreateGuaranteeDto, GuaranteeTemplateDto } from './dto/contract.dto';
import { ContractGuarantee, GuaranteeStatus } from './entities/contract-guarantee.entity';
import { GuaranteeTemplate } from './entities/guarantee-template.entity';

const formatDate = (iso: string): string => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
};

/**
 * Kafolat xati → qarzga o'tkazish:
 *  - only users with the "contract_credit" section can enter a letter;
 *  - the letter is compared with the template: a match opens the credit at once,
 *    otherwise it waits for a user with "contract_credit_approve";
 *  - total credit can never exceed the unpaid part of the contract (contract amount − transferred).
 */
@Injectable()
export class GuaranteesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly contracts: ContractsService,
    private readonly audit: AuditService,
  ) {}

  // ─────────────── Templates ───────────────

  listTemplates(): Promise<GuaranteeTemplate[]> {
    return this.dataSource.getRepository(GuaranteeTemplate).find({ order: { isActive: 'DESC', createdAt: 'DESC' } });
  }

  async createTemplate(dto: GuaranteeTemplateDto, user: AuthUser, meta: RequestMeta): Promise<GuaranteeTemplate> {
    const repo = this.dataSource.getRepository(GuaranteeTemplate);
    const t = await repo.save(repo.create({ name: dto.name, body: dto.body, isActive: dto.isActive ?? true, createdById: user.id }));
    await this.audit.log({ userId: user.id, action: AuditAction.CREATE, module: AUDIT_MODULES.PAYMENTS, entity: 'GuaranteeTemplate', entityId: t.id, newValue: { name: t.name }, description: `Guarantee template "${t.name}" created`, meta });
    return t;
  }

  async updateTemplate(id: string, dto: Partial<GuaranteeTemplateDto>, user: AuthUser, meta: RequestMeta): Promise<GuaranteeTemplate> {
    const repo = this.dataSource.getRepository(GuaranteeTemplate);
    const t = await repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Template not found');
    await repo.update(id, { ...(dto.name !== undefined && { name: dto.name }), ...(dto.body !== undefined && { body: dto.body }), ...(dto.isActive !== undefined && { isActive: dto.isActive }) });
    await this.audit.log({ userId: user.id, action: AuditAction.UPDATE, module: AUDIT_MODULES.PAYMENTS, entity: 'GuaranteeTemplate', entityId: id, oldValue: { name: t.name, isActive: t.isActive }, newValue: dto, description: `Guarantee template "${t.name}" updated`, meta });
    return repo.findOneOrFail({ where: { id } });
  }

  // ─────────────── Compare ───────────────

  private values(contract: Contract, dto: Pick<CreateGuaranteeDto, 'amount' | 'letterNumber' | 'letterDate'>): GuaranteeValues {
    return {
      shartnoma_raqami: contract.contractNumber,
      tashkilot: contract.organization ?? '',
      summa: formatMoney(dto.amount),
      shartnoma_summasi: contract.contractAmount != null ? formatMoney(contract.contractAmount) : '',
      xat_raqami: dto.letterNumber,
      sana: formatDate(dto.letterDate),
    };
  }

  private async template(templateId?: string): Promise<GuaranteeTemplate | null> {
    const repo = this.dataSource.getRepository(GuaranteeTemplate);
    if (templateId) {
      const t = await repo.findOne({ where: { id: templateId } });
      if (!t) throw new NotFoundException('Template not found');
      return t;
    }
    return repo.findOne({ where: { isActive: true }, order: { createdAt: 'DESC' } });
  }

  /** Dry run for the form: filled template + comparison result. */
  async preview(contractId: string, dto: CreateGuaranteeDto): Promise<GuaranteeMatch & { templateId: string | null }> {
    const contract = await this.dataSource.getRepository(Contract).findOne({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contract not found');
    const t = await this.template(dto.templateId);
    if (!t) return { matched: false, similarity: 0, missingLines: [], filledTemplate: '', templateId: null };
    return { ...matchGuarantee(t.body, this.values(contract, dto), dto.body ?? ''), templateId: t.id };
  }

  // ─────────────── Letters ───────────────

  async create(contractId: string, dto: CreateGuaranteeDto, user: AuthUser, meta: RequestMeta): Promise<ContractView> {
    await this.dataSource.transaction(async (manager) => {
      const contract = await manager.getRepository(Contract).findOne({ where: { id: contractId }, lock: { mode: 'pessimistic_write' } });
      if (!contract) throw new NotFoundException('Contract not found');
      if (!contract.isActive) throw new ConflictException(`Shartnoma ${contract.contractNumber} faol emas`);
      if (contract.contractAmount == null) {
        throw new BadRequestException("Avval shartnoma summasini kiriting — qarz faqat shartnoma summasining to'lanmagan qismi doirasida beriladi");
      }
      const b = (await this.contracts.balances([contractId], manager)).get(contractId);
      const unpaid = Math.max(0, roundMoney(contract.contractAmount - (b?.deposited ?? 0)));
      const open = await manager.getRepository(ContractGuarantee).find({ where: { contractId, status: In([GuaranteeStatus.APPROVED, GuaranteeStatus.PENDING]) } });
      const reserved = roundMoney(open.reduce((s, g) => s + g.amount, 0));
      const amount = roundMoney(dto.amount);
      if (amount + reserved > unpaid) {
        throw new BadRequestException(
          `Qarz limiti to'lanmagan summadan oshmasligi kerak: to'lanmagan ${formatMoney(unpaid)}, mavjud kafolatlar ${formatMoney(reserved)}, so'ralgan ${formatMoney(amount)}`,
        );
      }
      const t = await this.template(dto.templateId);
      const result = t ? matchGuarantee(t.body, this.values(contract, dto), dto.body) : { matched: false, similarity: 0, missingLines: [] as string[] };
      const status = result.matched ? GuaranteeStatus.APPROVED : GuaranteeStatus.PENDING;
      const repo = manager.getRepository(ContractGuarantee);
      const g = await repo.save(
        repo.create({
          contractId,
          templateId: t?.id ?? null,
          letterNumber: dto.letterNumber,
          letterDate: dto.letterDate.slice(0, 10),
          amount,
          validUntil: dto.validUntil?.slice(0, 10) ?? null,
          body: dto.body,
          templateMatched: result.matched,
          similarity: result.similarity,
          missingLines: result.missingLines,
          status,
          decidedAt: result.matched ? new Date() : null,
          decisionNote: result.matched ? 'Namunaga mos — avtomatik' : null,
          createdById: user.id,
        }),
      );
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.CREATE,
          module: AUDIT_MODULES.PAYMENTS,
          entity: 'ContractGuarantee',
          entityId: g.id,
          newValue: { contract: contract.contractNumber, letterNumber: g.letterNumber, amount, status, templateMatched: result.matched, similarity: result.similarity },
          description: `Guarantee letter ${g.letterNumber} for ${contract.contractNumber}: ${amount} UZS (${status})`,
          meta,
        },
        manager,
      );
    });
    return this.contracts.findOne(contractId);
  }

  private async decide(contractId: string, id: string, from: GuaranteeStatus[], to: GuaranteeStatus, note: string | undefined, user: AuthUser, meta: RequestMeta): Promise<ContractView> {
    const repo = this.dataSource.getRepository(ContractGuarantee);
    const g = await repo.findOne({ where: { id, contractId } });
    if (!g) throw new NotFoundException('Guarantee letter not found');
    if (!from.includes(g.status)) throw new ConflictException(`Kafolat xati holati: ${g.status}`);
    await repo.update(id, { status: to, decisionNote: note?.trim() || null, decidedById: user.id, decidedAt: new Date() });
    await this.audit.log({
      userId: user.id,
      action: AuditAction.UPDATE,
      module: AUDIT_MODULES.PAYMENTS,
      entity: 'ContractGuarantee',
      entityId: id,
      oldValue: { status: g.status },
      newValue: { status: to, note: note ?? null },
      description: `Guarantee letter ${g.letterNumber}: ${g.status} → ${to}`,
      meta,
    });
    return this.contracts.findOne(contractId);
  }

  approve(contractId: string, id: string, note: string | undefined, user: AuthUser, meta: RequestMeta) {
    return this.decide(contractId, id, [GuaranteeStatus.PENDING], GuaranteeStatus.APPROVED, note, user, meta);
  }

  reject(contractId: string, id: string, note: string | undefined, user: AuthUser, meta: RequestMeta) {
    return this.decide(contractId, id, [GuaranteeStatus.PENDING], GuaranteeStatus.REJECTED, note, user, meta);
  }

  revoke(contractId: string, id: string, note: string | undefined, user: AuthUser, meta: RequestMeta) {
    return this.decide(contractId, id, [GuaranteeStatus.APPROVED], GuaranteeStatus.REVOKED, note, user, meta);
  }
}
