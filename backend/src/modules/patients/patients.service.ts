import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, Repository } from 'typeorm';
import { AuditAction, Role } from '../../common/constants/enums';
import { paginated, Paginated } from '../../common/dto/paginated';
import { escapeLike, resolveSort } from '../../common/dto/pagination-query.dto';
import { IMAGE_STORAGE, ImageStorage } from '../../common/storage/image-storage';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { dayRangeToUtc } from '../../common/utils/time.util';
import { AUDIT_MODULES } from '../audit/audit.constants';
import { AuditService, diffObjects } from '../audit/audit.service';
import { Payment } from '../payments/entities/payment.entity';
import { QueueTicket } from '../queues/entities/queue-ticket.entity';
import { SettingsService } from '../settings/settings.service';
import { Visit } from '../visits/entities/visit.entity';
import { CreatePatientDto, DuplicateCheckQueryDto, PatientQueryDto, UpdatePatientDto } from './dto/patient.dto';
import { Patient } from './entities/patient.entity';

const SORTS = { createdAt: 'p.createdAt', lastName: 'p.lastName', firstName: 'p.firstName', birthDate: 'p.birthDate', patientCode: 'p.patientCode' };
const FIELDS = ['firstName', 'lastName', 'middleName', 'birthDate', 'gender', 'phone', 'email', 'address', 'passport', 'profession', 'avatar'];
/** Phone numbers are compared by their last N digits (ignores +998 / spaces / dashes). */
const PHONE_MATCH_DIGITS = 9;
const DUPLICATE_LIMIT = 10;

export const phoneDigits = (phone: string): string => phone.replace(/\D/g, '').slice(-PHONE_MATCH_DIGITS);

export interface PatientHistory {
  payments: Payment[];
  tickets: QueueTicket[];
  visits: Visit[];
}

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient) private readonly repo: Repository<Patient>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
    @Inject(IMAGE_STORAGE) private readonly images: ImageStorage,
  ) {}

  async findAll(query: PatientQueryDto): Promise<Paginated<Patient>> {
    const tz = await this.settings.getTimezone();
    const qb = this.repo.createQueryBuilder('p');
    if (query.search) {
      const s = `%${escapeLike(query.search.toLowerCase())}%`;
      const digits = query.search.replace(/\D/g, '');
      qb.andWhere(
        new Brackets((w) => {
          w.where("lower(p.firstName) LIKE :s ESCAPE '\\'", { s })
            .orWhere("lower(p.lastName) LIKE :s ESCAPE '\\'", { s })
            .orWhere("lower(p.middleName) LIKE :s ESCAPE '\\'", { s })
            .orWhere("lower(p.lastName || ' ' || p.firstName) LIKE :s ESCAPE '\\'", { s })
            .orWhere("lower(p.patientCode) LIKE :s ESCAPE '\\'", { s })
            .orWhere("lower(p.passport) LIKE :s ESCAPE '\\'", { s });
          if (digits.length >= 3) w.orWhere("regexp_replace(p.phone, '\\D', '', 'g') LIKE :d", { d: `%${digits}%` });
        }),
      );
    }
    if (query.gender) qb.andWhere('p.gender = :g', { g: query.gender });
    if (query.ageFrom !== undefined) {
      qb.andWhere(`p.birthDate <= (now() AT TIME ZONE :tz)::date - make_interval(years => :ageFrom)`, { tz, ageFrom: query.ageFrom });
    }
    if (query.ageTo !== undefined) {
      qb.andWhere(`p.birthDate > (now() AT TIME ZONE :tz)::date - make_interval(years => :ageToPlus)`, { tz, ageToPlus: query.ageTo + 1 });
    }
    const range = dayRangeToUtc(tz, query.dateFrom, query.dateTo);
    if (range.from) qb.andWhere('p.createdAt >= :from', { from: range.from });
    if (range.to) qb.andWhere('p.createdAt < :to', { to: range.to });
    qb.orderBy(resolveSort(query.sortBy, SORTS), query.sortOrder).addOrderBy('p.id').skip(query.skip).take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    return paginated(items, total, query.page, query.limit);
  }

  async findOne(id: string, manager?: EntityManager): Promise<Patient> {
    const repo = manager ? manager.getRepository(Patient) : this.repo;
    const patient = await repo
      .createQueryBuilder('p')
      .leftJoin('p.createdBy', 'cb')
      .addSelect(['cb.id', 'cb.firstName', 'cb.lastName'])
      .where('p.id = :id', { id })
      .getOne();
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  /** Doctors may only open patients that are (or were) in their own queue. */
  async assertDoctorAccess(user: AuthUser, patientId: string): Promise<void> {
    if (user.role !== Role.DOCTOR) return;
    const hasTicket = await this.dataSource
      .getRepository(QueueTicket)
      .exists({ where: { patientId, doctorId: user.doctorId ?? undefined } });
    if (!user.doctorId || !hasTicket) throw new ForbiddenException('This patient is not in your queue');
  }

  async history(id: string): Promise<PatientHistory> {
    await this.findOne(id);
    const [payments, tickets, visits] = await Promise.all([
      this.dataSource
        .getRepository(Payment)
        .find({ where: { patientId: id }, relations: { items: true, contract: true }, order: { createdAt: 'DESC' }, take: 100 }),
      this.dataSource
        .getRepository(QueueTicket)
        .createQueryBuilder('t')
        .leftJoinAndSelect('t.department', 'dep')
        .leftJoinAndSelect('t.doctor', 'doc')
        .leftJoin('doc.user', 'du')
        .addSelect(['du.id', 'du.firstName', 'du.lastName', 'du.middleName'])
        .leftJoinAndSelect('t.ticketServices', 'ts')
        .where('t.patientId = :id', { id })
        .orderBy('t.createdAt', 'DESC')
        .take(100)
        .getMany(),
      this.dataSource.getRepository(Visit).find({ where: { patientId: id }, order: { startedAt: 'DESC' }, take: 100 }),
    ]);
    for (const t of tickets) {
      t.services = (t.ticketServices ?? []).map((ts) => ({ id: ts.serviceId, name: ts.serviceName }));
      delete t.ticketServices;
    }
    return { payments, tickets, visits };
  }

  async findDuplicates(query: DuplicateCheckQueryDto, manager?: EntityManager): Promise<Patient[]> {
    const repo = manager ? manager.getRepository(Patient) : this.repo;
    const qb = repo.createQueryBuilder('p');
    let hasCriteria = false;
    qb.where(
      new Brackets((w) => {
        if (query.phone && phoneDigits(query.phone).length >= 7) {
          hasCriteria = true;
          w.orWhere(`right(regexp_replace(p.phone, '\\D', '', 'g'), ${PHONE_MATCH_DIGITS}) = :digits`, { digits: phoneDigits(query.phone) });
        }
        if (query.passport) {
          hasCriteria = true;
          w.orWhere('lower(p.passport) = :passport', { passport: query.passport.trim().toLowerCase() });
        }
        if (query.firstName && query.lastName) {
          hasCriteria = true;
          const byName = new Brackets((n) => {
            n.where('lower(p.firstName) = :fn', { fn: query.firstName!.trim().toLowerCase() }).andWhere('lower(p.lastName) = :ln', {
              ln: query.lastName!.trim().toLowerCase(),
            });
            if (query.birthDate) n.andWhere('p.birthDate = :bd', { bd: query.birthDate.slice(0, 10) });
          });
          w.orWhere(byName);
        }
      }),
    );
    if (!hasCriteria) return [];
    return qb.orderBy('p.createdAt', 'DESC').take(DUPLICATE_LIMIT).getMany();
  }

  /** Transaction-aware create used both by the REST endpoint and the checkout flow. */
  async createWithManager(manager: EntityManager, dto: CreatePatientDto, actorId: string, meta: RequestMeta): Promise<Patient> {
    const repo = manager.getRepository(Patient);
    const avatar = dto.avatar ? await this.images.save(dto.avatar, 'patients') : null;
    const inserted = await repo.save(repo.create({ ...dto, avatar, createdById: actorId }));
    const patient = await this.findOne(inserted.id, manager);
    await this.audit.log(
      {
        userId: actorId,
        action: AuditAction.CREATE,
        module: AUDIT_MODULES.PATIENTS,
        entity: 'Patient',
        entityId: patient.id,
        newValue: { patientCode: patient.patientCode, firstName: patient.firstName, lastName: patient.lastName, phone: patient.phone },
        description: `Patient created: ${patient.lastName} ${patient.firstName} (${patient.patientCode})`,
        meta,
      },
      manager,
    );
    return patient;
  }

  create(dto: CreatePatientDto, actorId: string, meta: RequestMeta): Promise<Patient> {
    return this.dataSource.transaction((manager) => this.createWithManager(manager, dto, actorId, meta));
  }

  async update(id: string, dto: UpdatePatientDto, actorId: string, meta: RequestMeta): Promise<Patient> {
    const patient = await this.repo.findOne({ where: { id } });
    if (!patient) throw new NotFoundException('Patient not found');
    const before = { ...patient };
    const { avatar, ...fields } = dto;
    Object.assign(patient, fields);
    if (avatar !== undefined) patient.avatar = avatar ? await this.images.save(avatar, 'patients') : null;
    await this.repo.save(patient);
    const diff = diffObjects(before, patient, FIELDS);
    if (Object.keys(diff.newValue).length) {
      await this.audit.log({
        userId: actorId,
        action: AuditAction.UPDATE,
        module: AUDIT_MODULES.PATIENTS,
        entity: 'Patient',
        entityId: id,
        ...diff,
        description: `Patient updated: ${patient.lastName} ${patient.firstName}`,
        meta,
      });
    }
    return this.findOne(id);
  }
}
