import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { KIOSK_CLAIM_TIMEOUT_MINUTES } from '../../common/constants/app.constants';
import { AuditAction, KioskRequestStatus, UserStatus } from '../../common/constants/enums';
import { paginated, Paginated } from '../../common/dto/paginated';
import { escapeLike, resolveSort } from '../../common/dto/pagination-query.dto';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { sumMoney } from '../../common/utils/money.util';
import { dayRangeToUtc } from '../../common/utils/time.util';
import { AUDIT_MODULES } from '../audit/audit.constants';
import { AuditService } from '../audit/audit.service';
import { Department } from '../departments/entities/department.entity';
import { PatientsService } from '../patients/patients.service';
import { RealtimeService } from '../realtime/realtime.service';
import { MedicalService } from '../services/entities/service.entity';
import { SettingsService } from '../settings/settings.service';
import { CreateKioskRequestDto, KioskRequestQueryDto } from './dto/kiosk.dto';
import { KioskRequestItem } from './entities/kiosk-request-item.entity';
import { KioskRequest } from './entities/kiosk-request.entity';

const SORTS = { createdAt: 'r.createdAt', number: 'r.number', totalAmount: 'r.totalAmount' };
const OPEN_STATUSES = [KioskRequestStatus.NEW, KioskRequestStatus.IN_REVIEW];
const MS_PER_MINUTE = 60_000;

export type CatalogDepartment = Department & { services: MedicalService[] };

@Injectable()
export class KioskService {
  constructor(
    @InjectRepository(KioskRequest) private readonly repo: Repository<KioskRequest>,
    private readonly dataSource: DataSource,
    private readonly patients: PatientsService,
    private readonly realtime: RealtimeService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
  ) {}

  /** Services a patient can actually get today: active service, active department, ≥1 available active doctor. */
  private bookableServicesQuery(manager: EntityManager = this.dataSource.manager) {
    return manager
      .getRepository(MedicalService)
      .createQueryBuilder('s')
      .innerJoin('s.department', 'd', 'd.isActive = true')
      .where('s.isActive = true')
      .andWhere(
        `EXISTS (SELECT 1 FROM doctor_services ds
                 JOIN doctors doc ON doc.id = ds.doctor_id
                 JOIN users u ON u.id = doc.user_id
                 WHERE ds.service_id = s.id AND doc.is_available = true AND u.status = :active)`,
        { active: UserStatus.ACTIVE },
      );
  }

  async catalog(): Promise<{ departments: CatalogDepartment[] }> {
    const services = await this.bookableServicesQuery().orderBy('s.name', 'ASC').getMany();
    const depIds = [...new Set(services.map((s) => s.departmentId))];
    if (!depIds.length) return { departments: [] };
    const departments = await this.dataSource
      .getRepository(Department)
      .find({ where: { id: In(depIds) }, order: { sortOrder: 'ASC', name: 'ASC' } });
    return {
      departments: departments.map((d) => Object.assign(d, { services: services.filter((s) => s.departmentId === d.id) })),
    };
  }

  async create(dto: CreateKioskRequestDto, kioskUser: AuthUser, meta: RequestMeta): Promise<KioskRequest> {
    const services = await this.bookableServicesQuery().andWhere('s.id IN (:...ids)', { ids: dto.serviceIds }).getMany();
    if (services.length !== dto.serviceIds.length) {
      throw new BadRequestException('Some selected services are not available at the moment');
    }
    const id = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(KioskRequest);
      const request = await repo.save(
        repo.create({
          firstName: dto.firstName,
          lastName: dto.lastName,
          middleName: dto.middleName ?? null,
          phone: dto.phone,
          birthDate: dto.birthDate ?? null,
          gender: dto.gender ?? null,
          totalAmount: sumMoney(services.map((s) => s.price)),
          kioskUserId: kioskUser.id,
          status: KioskRequestStatus.NEW,
        }),
      );
      await manager.getRepository(KioskRequestItem).insert(
        dto.serviceIds.map((sid) => {
          const s = services.find((x) => x.id === sid)!;
          return { kioskRequestId: request.id, serviceId: s.id, serviceName: s.name, price: s.price };
        }),
      );
      await this.audit.log(
        {
          userId: kioskUser.id,
          action: AuditAction.CREATE,
          module: AUDIT_MODULES.KIOSK,
          entity: 'KioskRequest',
          entityId: request.id,
          newValue: { fullName: `${dto.lastName} ${dto.firstName}`, phone: dto.phone, serviceIds: dto.serviceIds },
          description: `Kiosk request created by ${kioskUser.login}`,
          meta,
        },
        manager,
      );
      return request.id;
    });
    const created = await this.findOne(id, false);
    this.realtime.kioskNew({
      id: created.id,
      number: created.number,
      fullName: `${created.lastName} ${created.firstName}`,
      totalAmount: created.totalAmount,
      servicesCount: created.items.length,
    });
    return created;
  }

  async findAll(query: KioskRequestQueryDto): Promise<Paginated<KioskRequest>> {
    const tz = await this.settings.getTimezone();
    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.items', 'i')
      .leftJoin('r.kioskUser', 'ku')
      .addSelect(['ku.id', 'ku.login'])
      .leftJoin('r.processedBy', 'pb')
      .addSelect(['pb.id', 'pb.firstName', 'pb.lastName']);
    qb.where('r.status IN (:...statuses)', { statuses: query.status?.length ? query.status : OPEN_STATUSES });
    const range = dayRangeToUtc(tz, query.dateFrom, query.dateTo);
    if (range.from) qb.andWhere('r.createdAt >= :from', { from: range.from });
    if (range.to) qb.andWhere('r.createdAt < :to', { to: range.to });
    if (query.search) {
      const s = `%${escapeLike(query.search)}%`;
      qb.andWhere("(r.firstName ILIKE :s ESCAPE '\\' OR r.lastName ILIKE :s ESCAPE '\\' OR r.phone ILIKE :s ESCAPE '\\' OR CAST(r.number AS text) LIKE :s)", { s });
    }
    qb.orderBy(resolveSort(query.sortBy, SORTS), query.sortOrder).addOrderBy('i.serviceName', 'ASC').skip(query.skip).take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    return paginated(items, total, query.page, query.limit);
  }

  async findOne(id: string, withMatches = true, manager?: EntityManager): Promise<KioskRequest> {
    const repo = manager ? manager.getRepository(KioskRequest) : this.repo;
    const request = await repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.items', 'i')
      .leftJoinAndSelect('i.service', 's')
      .leftJoinAndSelect('s.department', 'sd')
      .leftJoin('r.kioskUser', 'ku')
      .addSelect(['ku.id', 'ku.login'])
      .leftJoin('r.processedBy', 'pb')
      .addSelect(['pb.id', 'pb.firstName', 'pb.lastName'])
      .where('r.id = :id', { id })
      .getOne();
    if (!request) throw new NotFoundException('Kiosk request not found');
    if (withMatches) {
      request.matchedPatients = await this.patients.findDuplicates({
        phone: request.phone,
        firstName: request.firstName,
        lastName: request.lastName,
        birthDate: request.birthDate ?? undefined,
      });
    }
    return request;
  }

  async claim(id: string, user: AuthUser): Promise<KioskRequest> {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(KioskRequest);
      const req = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!req) throw new NotFoundException('Kiosk request not found');
      if (!OPEN_STATUSES.includes(req.status)) throw new ConflictException(`Request is already ${req.status}`);
      const claimFresh = req.claimedAt && Date.now() - req.claimedAt.getTime() < KIOSK_CLAIM_TIMEOUT_MINUTES * MS_PER_MINUTE;
      if (req.status === KioskRequestStatus.IN_REVIEW && req.claimedById && req.claimedById !== user.id && claimFresh) {
        throw new ConflictException('Request is being processed by another registrar');
      }
      await repo.update(id, { status: KioskRequestStatus.IN_REVIEW, claimedById: user.id, claimedAt: new Date() });
    });
    this.realtime.kioskUpdated({ id, status: KioskRequestStatus.IN_REVIEW });
    return this.findOne(id);
  }

  async cancel(id: string, reason: string | undefined, user: AuthUser, meta: RequestMeta): Promise<KioskRequest> {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(KioskRequest);
      const req = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!req) throw new NotFoundException('Kiosk request not found');
      if (!OPEN_STATUSES.includes(req.status)) throw new ConflictException(`Request is already ${req.status}`);
      await repo.update(id, { status: KioskRequestStatus.CANCELLED, cancelReason: reason ?? null, processedById: user.id, processedAt: new Date() });
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.CANCEL,
          module: AUDIT_MODULES.KIOSK,
          entity: 'KioskRequest',
          entityId: id,
          oldValue: { status: req.status },
          newValue: { status: KioskRequestStatus.CANCELLED, reason: reason ?? null },
          description: `Kiosk request #${req.number} cancelled`,
          meta,
        },
        manager,
      );
    });
    this.realtime.kioskUpdated({ id, status: KioskRequestStatus.CANCELLED });
    return this.findOne(id, false);
  }
}
