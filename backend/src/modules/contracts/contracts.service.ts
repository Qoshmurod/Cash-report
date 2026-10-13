import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { AuditAction, PaymentMethod } from '../../common/constants/enums';
import { paginated, Paginated } from '../../common/dto/paginated';
import { escapeLike } from '../../common/dto/pagination-query.dto';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { roundMoney } from '../../common/utils/money.util';
import { isUniqueViolation } from '../../common/utils/pg-error.util';
import { dateInTz } from '../../common/utils/time.util';
import { AUDIT_MODULES } from '../audit/audit.constants';
import { AuditService } from '../audit/audit.service';
import { Patient } from '../patients/entities/patient.entity';
import { PatientsService } from '../patients/patients.service';
import { Contract } from '../payments/entities/contract.entity';
import { SettingsService } from '../settings/settings.service';
import { AddContractPatientsDto, AddDepositDto, ContractQueryDto, CreateContractDto, UpdateContractDto } from './dto/contract.dto';
import { ContractDeposit } from './entities/contract-deposit.entity';
import { ContractGuarantee } from './entities/contract-guarantee.entity';
import { ContractPatient } from './entities/contract-patient.entity';

export interface ContractBalance {
  /** Everything the organization transferred. */
  deposited: number;
  /** Net amount of services rendered under the contract (payments − refunds). */
  spent: number;
  /** deposited − spent. */
  balance: number;
  /** Credit opened by approved, valid guarantee letters (kafolat xati). */
  credit: number;
  /** Money used beyond what was transferred (spent − deposited, ≥ 0). */
  debt: number;
  /** What may still be spent: balance + credit. */
  available: number;
  /** contractAmount − deposited (null when the contract amount is not set). */
  unpaid: number | null;
  /** balance as % of deposited (0 when nothing deposited). */
  balancePercent: number;
  /** balance ≤ warningThresholdPercent % of deposited. */
  lowBalance: boolean;
  patientsCount: number;
}

export type ContractView = Contract & ContractBalance;
type RawBalance = Pick<ContractBalance, 'deposited' | 'spent' | 'balance' | 'patientsCount' | 'credit'>;

/** Approved guarantee credit, capped by what the organization still owes under the contract. */
export const effectiveCredit = (credit: number, unpaid: number | null): number =>
  roundMoney(Math.max(0, unpaid == null ? 0 : Math.min(credit, unpaid)));

const BALANCE_SQL = `
  SELECT c.id,
         COALESCE((SELECT SUM(d.amount) FROM contract_deposits d WHERE d.contract_id = c.id), 0) AS deposited,
         COALESCE((SELECT SUM(CASE WHEN t.type = 'PAYMENT' THEN t.amount ELSE -t.amount END)
                     FROM payment_transactions t JOIN payments p ON p.id = t.payment_id
                    WHERE p.contract_id = c.id AND t.method = '${PaymentMethod.CONTRACT}'), 0) AS spent,
         (SELECT COUNT(*) FROM contract_patients cp WHERE cp.contract_id = c.id) AS patients_count,
         COALESCE((SELECT SUM(g.amount) FROM contract_guarantees g
                    WHERE g.contract_id = c.id AND g.status = 'APPROVED'
                      AND (g.valid_until IS NULL OR g.valid_until >= CURRENT_DATE)), 0) AS credit
  FROM contracts c`;

@Injectable()
export class ContractsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly patients: PatientsService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  // ─────────────── Balance ───────────────

  async balances(ids: string[], manager: EntityManager = this.dataSource.manager): Promise<Map<string, RawBalance>> {
    const map = new Map<string, RawBalance>();
    if (!ids.length) return map;
    const rows: { id: string; deposited: string; spent: string; patients_count: string; credit: string }[] = await manager.query(
      `${BALANCE_SQL} WHERE c.id = ANY($1::uuid[])`,
      [ids],
    );
    for (const r of rows) {
      const deposited = roundMoney(Number(r.deposited));
      const spent = roundMoney(Number(r.spent));
      map.set(r.id, { deposited, spent, balance: roundMoney(deposited - spent), patientsCount: Number(r.patients_count), credit: roundMoney(Number(r.credit)) });
    }
    return map;
  }

  present(contract: Contract, b: RawBalance | undefined): ContractView {
    const base = b ?? { deposited: 0, spent: 0, balance: 0, patientsCount: 0, credit: 0 };
    const balancePercent = base.deposited > 0 ? Math.round((base.balance / base.deposited) * 1000) / 10 : 0;
    const lowBalance = base.deposited > 0 ? balancePercent <= contract.warningThresholdPercent : true;
    const debt = Math.max(0, roundMoney(base.spent - base.deposited));
    const unpaid = contract.contractAmount != null ? Math.max(0, roundMoney(contract.contractAmount - base.deposited)) : null;
    // Credit never exceeds the unpaid part of the contract: transfers received later shrink it,
    // so the total spendable stays within the contract amount.
    const credit = effectiveCredit(base.credit, unpaid);
    const available = Math.max(0, roundMoney(base.balance + credit));
    return Object.assign(contract, base, { credit, balancePercent, lowBalance, debt, available, unpaid });
  }

  // ─────────────── Queries ───────────────

  async findAll(query: ContractQueryDto): Promise<Paginated<ContractView>> {
    const qb = this.dataSource.getRepository(Contract).createQueryBuilder('c');
    if (query.search) {
      qb.andWhere("(c.contractNumber ILIKE :s ESCAPE '\\' OR c.organization ILIKE :s ESCAPE '\\')", { s: `%${escapeLike(query.search)}%` });
    }
    if (query.active !== undefined) qb.andWhere('c.isActive = :active', { active: query.active });
    qb.orderBy('c.isActive', 'DESC').addOrderBy('c.createdAt', query.sortOrder);
    let items: ContractView[];
    let total: number;
    if (query.lowBalance) {
      // threshold depends on computed balance → filter in memory (contract count is small)
      const all = await qb.getMany();
      const b = await this.balances(all.map((c) => c.id));
      const low = all.map((c) => this.present(c, b.get(c.id))).filter((c) => c.lowBalance && c.isActive);
      total = low.length;
      items = low.slice(query.skip, query.skip + query.limit);
    } else {
      const [rows, count] = await qb.skip(query.skip).take(query.limit).getManyAndCount();
      const b = await this.balances(rows.map((c) => c.id));
      items = rows.map((c) => this.present(c, b.get(c.id)));
      total = count;
    }
    return paginated(items, total, query.page, query.limit);
  }

  async lowBalanceCount(): Promise<number> {
    const all = await this.dataSource.getRepository(Contract).find({ where: { isActive: true } });
    const b = await this.balances(all.map((c) => c.id));
    return all.map((c) => this.present(c, b.get(c.id))).filter((c) => c.lowBalance).length;
  }

  async findOne(
    id: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<ContractView & { deposits: ContractDeposit[]; patients: ContractPatient[]; guarantees: ContractGuarantee[] }> {
    const contract = await manager.getRepository(Contract).findOne({ where: { id } });
    if (!contract) throw new NotFoundException('Contract not found');
    const b = await this.balances([id], manager);
    const deposits = await manager
      .getRepository(ContractDeposit)
      .createQueryBuilder('d')
      .leftJoin('d.createdBy', 'u')
      .addSelect(['u.id', 'u.firstName', 'u.lastName'])
      .where('d.contractId = :id', { id })
      .orderBy('d.depositDate', 'DESC')
      .addOrderBy('d.createdAt', 'DESC')
      .getMany();
    const patients = await manager
      .getRepository(ContractPatient)
      .createQueryBuilder('cp')
      .leftJoin('cp.patient', 'p')
      .addSelect(['p.id', 'p.patientCode', 'p.firstName', 'p.lastName', 'p.middleName', 'p.phone', 'p.birthDate', 'p.gender', 'p.passport'])
      .where('cp.contractId = :id', { id })
      .orderBy('p.lastName', 'ASC')
      .addOrderBy('p.firstName', 'ASC')
      .getMany();
    const guarantees = await manager
      .getRepository(ContractGuarantee)
      .createQueryBuilder('g')
      .leftJoin('g.createdBy', 'cu')
      .addSelect(['cu.id', 'cu.firstName', 'cu.lastName'])
      .leftJoin('g.decidedBy', 'du')
      .addSelect(['du.id', 'du.firstName', 'du.lastName'])
      .leftJoin('g.template', 'gt')
      .addSelect(['gt.id', 'gt.name'])
      .where('g.contractId = :id', { id })
      .orderBy('g.createdAt', 'DESC')
      .getMany();
    return Object.assign(this.present(contract, b.get(id)), { deposits, patients, guarantees });
  }

  /** Active contracts that list this patient — what the registrar can choose at checkout. */
  async forPatient(patientId: string): Promise<ContractView[]> {
    const tz = await this.settings.getTimezone();
    const today = dateInTz(tz);
    const rows = await this.dataSource
      .getRepository(Contract)
      .createQueryBuilder('c')
      .innerJoin(ContractPatient, 'cp', 'cp.contract_id = c.id AND cp.patient_id = :patientId', { patientId })
      .where('c.isActive = true')
      .andWhere('(c.startDate IS NULL OR c.startDate <= :today)', { today })
      .andWhere('(c.endDate IS NULL OR c.endDate >= :today)', { today })
      .orderBy('c.contractNumber', 'ASC')
      .getMany();
    const b = await this.balances(rows.map((c) => c.id));
    return rows.map((c) => this.present(c, b.get(c.id)));
  }

  // ─────────────── Checkout guard ───────────────

  /**
   * Called inside the checkout transaction: locks the contract and verifies that it is
   * active, the patient is on its list, and the balance covers `amount`.
   */
  async reserve(manager: EntityManager, contractId: string, patientId: string, amount: number): Promise<{ contract: Contract; balanceAfter: number; lowBalance: boolean }> {
    const contract = await manager.getRepository(Contract).findOne({ where: { id: contractId }, lock: { mode: 'pessimistic_write' } });
    if (!contract) throw new NotFoundException('Contract not found');
    if (!contract.isActive) throw new ConflictException(`Shartnoma ${contract.contractNumber} faol emas`);
    const today = dateInTz(await this.settings.getTimezone());
    if ((contract.startDate && contract.startDate > today) || (contract.endDate && contract.endDate < today)) {
      throw new ConflictException(`Shartnoma ${contract.contractNumber} muddati amal qilmaydi`);
    }
    const listed = await manager.getRepository(ContractPatient).exist({ where: { contractId, patientId } });
    if (!listed) throw new ConflictException(`Mijoz shartnoma ${contract.contractNumber} ro'yxatida yo'q`);
    const b = (await this.balances([contractId], manager)).get(contractId);
    const balance = b?.balance ?? 0;
    const unpaid = contract.contractAmount != null ? Math.max(0, roundMoney(contract.contractAmount - (b?.deposited ?? 0))) : null;
    const credit = effectiveCredit(b?.credit ?? 0, unpaid);
    const available = roundMoney(balance + credit);
    if (roundMoney(amount) > available) {
      throw new ConflictException(
        `Shartnoma ${contract.contractNumber} bo'yicha mablag' yetarli emas: qoldiq ${balance}, kafolat xati bo'yicha qarz limiti ${credit}, kerak ${roundMoney(amount)}`,
      );
    }
    const after = this.present({ ...contract } as Contract, b && { ...b, spent: roundMoney(b.spent + amount), balance: roundMoney(balance - amount) });
    return { contract, balanceAfter: after.balance, lowBalance: after.lowBalance };
  }

  // ─────────────── Commands ───────────────

  async create(dto: CreateContractDto, user: AuthUser, meta: RequestMeta): Promise<ContractView> {
    this.checkDates(dto.startDate, dto.endDate);
    const tz = await this.settings.getTimezone();
    try {
      const id = await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(Contract);
        const contract = await repo.save(
          repo.create({
            contractNumber: dto.contractNumber,
            organization: dto.organization ?? null,
            note: dto.note ?? null,
            startDate: dto.startDate ?? null,
            endDate: dto.endDate ?? null,
            warningThresholdPercent: dto.warningThresholdPercent ?? 10,
            contractAmount: dto.contractAmount ?? null,
            isActive: true,
          }),
        );
        if (dto.initialDeposit) {
          await manager.getRepository(ContractDeposit).insert({
            contractId: contract.id,
            amount: roundMoney(dto.initialDeposit),
            depositDate: dateInTz(tz),
            note: 'Boshlang‘ich o‘tkazma',
            createdById: user.id,
          });
        }
        await this.audit.log(
          {
            userId: user.id,
            action: AuditAction.CREATE,
            module: AUDIT_MODULES.PAYMENTS,
            entity: 'Contract',
            entityId: contract.id,
            newValue: { ...dto },
            description: `Contract ${contract.contractNumber} created`,
            meta,
          },
          manager,
        );
        return contract.id;
      });
      return this.findOne(id);
    } catch (e) {
      if (isUniqueViolation(e, 'uq_contracts_number')) throw new ConflictException('Bu raqamli shartnoma allaqachon mavjud');
      throw e;
    }
  }

  async update(id: string, dto: UpdateContractDto, user: AuthUser, meta: RequestMeta): Promise<ContractView> {
    const repo = this.dataSource.getRepository(Contract);
    const contract = await repo.findOne({ where: { id } });
    if (!contract) throw new NotFoundException('Contract not found');
    const { initialDeposit: _ignored, ...changes } = dto;
    this.checkDates(changes.startDate ?? contract.startDate, changes.endDate ?? contract.endDate);
    const before = { ...contract };
    try {
      await repo.update(id, changes);
    } catch (e) {
      if (isUniqueViolation(e, 'uq_contracts_number')) throw new ConflictException('Bu raqamli shartnoma allaqachon mavjud');
      throw e;
    }
    await this.audit.log({
      userId: user.id,
      action: AuditAction.UPDATE,
      module: AUDIT_MODULES.PAYMENTS,
      entity: 'Contract',
      entityId: id,
      oldValue: before,
      newValue: changes,
      description: `Contract ${contract.contractNumber} updated`,
      meta,
    });
    return this.findOne(id);
  }

  async addDeposit(id: string, dto: AddDepositDto, user: AuthUser, meta: RequestMeta): Promise<ContractView> {
    const tz = await this.settings.getTimezone();
    await this.dataSource.transaction(async (manager) => {
      const contract = await manager.getRepository(Contract).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!contract) throw new NotFoundException('Contract not found');
      const amount = roundMoney(dto.amount);
      if (amount < 0) {
        const b = (await this.balances([id], manager)).get(id);
        if ((b?.balance ?? 0) + amount < 0) throw new BadRequestException('Tuzatish qoldiqni manfiy qiladi');
      }
      await manager.getRepository(ContractDeposit).insert({
        contractId: id,
        amount,
        depositDate: dto.depositDate?.slice(0, 10) ?? dateInTz(tz),
        documentNumber: dto.documentNumber ?? null,
        note: dto.note ?? null,
        createdById: user.id,
      });
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.PAYMENT,
          module: AUDIT_MODULES.PAYMENTS,
          entity: 'Contract',
          entityId: id,
          newValue: { deposit: amount, documentNumber: dto.documentNumber ?? null },
          description: `Contract ${contract.contractNumber}: transfer ${amount} UZS`,
          meta,
        },
        manager,
      );
    });
    return this.findOne(id);
  }

  async addPatients(id: string, dto: AddContractPatientsDto, user: AuthUser, meta: RequestMeta): Promise<ContractView> {
    if (!dto.patientIds?.length && !dto.patient) throw new BadRequestException('patientIds or patient is required');
    await this.dataSource.transaction(async (manager) => {
      const contract = await manager.getRepository(Contract).findOne({ where: { id } });
      if (!contract) throw new NotFoundException('Contract not found');
      const ids = [...new Set(dto.patientIds ?? [])];
      if (ids.length) {
        const found = await manager.getRepository(Patient).count({ where: { id: In(ids) } });
        if (found !== ids.length) throw new BadRequestException('Some patients were not found');
      }
      if (dto.patient) ids.push((await this.patients.createWithManager(manager, dto.patient, user.id, meta)).id);
      await manager
        .getRepository(ContractPatient)
        .createQueryBuilder()
        .insert()
        .values(ids.map((patientId) => ({ contractId: id, patientId, note: dto.note ?? null, createdById: user.id })))
        .orIgnore()
        .execute();
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.UPDATE,
          module: AUDIT_MODULES.PAYMENTS,
          entity: 'Contract',
          entityId: id,
          newValue: { addedPatients: ids },
          description: `Contract ${contract.contractNumber}: ${ids.length} patient(s) added to the list`,
          meta,
        },
        manager,
      );
    });
    return this.findOne(id);
  }

  async removePatient(id: string, patientId: string, user: AuthUser, meta: RequestMeta): Promise<ContractView> {
    const res = await this.dataSource.getRepository(ContractPatient).delete({ contractId: id, patientId });
    if (!res.affected) throw new NotFoundException('Patient is not on this contract');
    await this.audit.log({
      userId: user.id,
      action: AuditAction.DELETE,
      module: AUDIT_MODULES.PAYMENTS,
      entity: 'Contract',
      entityId: id,
      oldValue: { patientId },
      description: `Patient removed from contract list`,
      meta,
    });
    return this.findOne(id);
  }

  private checkDates(start?: string | null, end?: string | null): void {
    if (start && end && start.slice(0, 10) > end.slice(0, 10)) throw new BadRequestException('startDate must be before endDate');
  }
}
