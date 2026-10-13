import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository, SelectQueryBuilder } from 'typeorm';
import { AuditAction, UserStatus } from '../../common/constants/enums';
import { paginated, Paginated } from '../../common/dto/paginated';
import { escapeLike, resolveSort } from '../../common/dto/pagination-query.dto';
import { RequestMeta } from '../../common/types/auth.types';
import { AUDIT_MODULES } from '../audit/audit.constants';
import { AuditService, diffObjects } from '../audit/audit.service';
import { MedicalService } from '../services/entities/service.entity';
import { DoctorProfileDto, DoctorQueryDto, UpdateDoctorDto } from './dto/doctor.dto';
import { DoctorService } from './entities/doctor-service.entity';
import { Doctor } from './entities/doctor.entity';

const SORTS = {
  createdAt: 'd.createdAt',
  lastName: 'u.lastName',
  specialty: 'd.specialty',
  roomNumber: 'd.roomNumber',
};

const USER_REF_FIELDS = ['u.id', 'u.firstName', 'u.lastName', 'u.middleName', 'u.phone', 'u.status', 'u.avatar'];

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor) private readonly repo: Repository<Doctor>,
    private readonly audit: AuditService,
  ) {}

  /** Base query: doctor + limited user fields + assigned services (with department). */
  private baseQuery(manager?: EntityManager): SelectQueryBuilder<Doctor> {
    const repo = manager ? manager.getRepository(Doctor) : this.repo;
    return repo
      .createQueryBuilder('d')
      .leftJoin('d.user', 'u')
      .addSelect(USER_REF_FIELDS)
      .leftJoinAndSelect('d.doctorServices', 'ds')
      .leftJoinAndSelect('ds.service', 's')
      .leftJoinAndSelect('s.department', 'sd');
  }

  /** Flattens join rows into `services: Service[]` for the API shape. */
  static present(doctor: Doctor): Doctor {
    doctor.services = (doctor.doctorServices ?? [])
      .map((ds) => ds.service)
      .filter((s): s is MedicalService => Boolean(s))
      .sort((a, b) => a.name.localeCompare(b.name));
    delete doctor.doctorServices;
    return doctor;
  }

  async findAll(query: DoctorQueryDto): Promise<Paginated<Doctor>> {
    const idsQb = this.repo.createQueryBuilder('d').leftJoin('d.user', 'u').select('d.id', 'id');
    if (query.serviceId || query.departmentId) {
      idsQb.innerJoin('d.doctorServices', 'fds').innerJoin('fds.service', 'fs');
      if (query.serviceId) idsQb.andWhere('fs.id = :serviceId', { serviceId: query.serviceId });
      if (query.departmentId) idsQb.andWhere('fs.departmentId = :departmentId', { departmentId: query.departmentId });
    }
    if (query.available !== undefined) {
      if (query.available) {
        idsQb.andWhere('d.isAvailable = true AND u.status = :active', { active: UserStatus.ACTIVE });
      } else {
        idsQb.andWhere('(d.isAvailable = false OR u.status <> :active)', { active: UserStatus.ACTIVE });
      }
    }
    if (query.specialty) idsQb.andWhere('d.specialty ILIKE :sp', { sp: `%${escapeLike(query.specialty)}%` });
    if (query.search) {
      idsQb.andWhere(
        "(u.firstName ILIKE :s ESCAPE '\\' OR u.lastName ILIKE :s ESCAPE '\\' OR d.specialty ILIKE :s ESCAPE '\\' OR d.roomNumber ILIKE :s ESCAPE '\\')",
        { s: `%${escapeLike(query.search)}%` },
      );
    }
    const sort = resolveSort(query.sortBy, SORTS);
    idsQb.groupBy('d.id').addGroupBy(sort).orderBy(sort, query.sortOrder);
    const total = (await idsQb.clone().getRawMany<{ id: string }>()).length;
    if (!query.all) idsQb.offset(query.skip).limit(query.limit);
    const ids = (await idsQb.getRawMany<{ id: string }>()).map((r) => r.id);
    if (ids.length === 0) return paginated([], total, query.page, query.all ? Math.max(total, 1) : query.limit);
    const rows = await this.baseQuery().where('d.id IN (:...ids)', { ids }).getMany();
    const byId = new Map(rows.map((d) => [d.id, DoctorsService.present(d)]));
    const items = ids.map((id) => byId.get(id)).filter((d): d is Doctor => Boolean(d));
    return paginated(items, total, query.page, query.all ? Math.max(total, 1) : query.limit);
  }

  async findOne(id: string, manager?: EntityManager): Promise<Doctor> {
    const doctor = await this.baseQuery(manager).where('d.id = :id', { id }).getOne();
    if (!doctor) throw new NotFoundException('Doctor not found');
    return DoctorsService.present(doctor);
  }

  async findByUserId(userId: string): Promise<Doctor> {
    const doctor = await this.baseQuery().where('d.userId = :userId', { userId }).getOne();
    if (!doctor) throw new NotFoundException('Doctor profile not found for this user');
    return DoctorsService.present(doctor);
  }

  /** Called inside the user-creation transaction. */
  async createForUser(manager: EntityManager, userId: string, dto: DoctorProfileDto): Promise<Doctor> {
    const repo = manager.getRepository(Doctor);
    const doctor = await repo.save(
      repo.create({ userId, specialty: dto.specialty, roomNumber: dto.roomNumber, workSchedule: dto.workSchedule ?? {}, isAvailable: true }),
    );
    if (dto.serviceIds?.length) await this.replaceServices(manager, doctor.id, dto.serviceIds);
    return doctor;
  }

  async update(id: string, dto: UpdateDoctorDto, actorId: string, meta: RequestMeta): Promise<Doctor> {
    const doctor = await this.repo.findOne({ where: { id } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    const before = { ...doctor };
    Object.assign(doctor, dto);
    await this.repo.save(doctor);
    const diff = diffObjects(before, doctor, ['specialty', 'roomNumber', 'workSchedule', 'isAvailable']);
    if (Object.keys(diff.newValue).length) {
      await this.audit.log({
        userId: actorId,
        action: AuditAction.UPDATE,
        module: AUDIT_MODULES.DOCTORS,
        entity: 'Doctor',
        entityId: id,
        ...diff,
        description:
          dto.roomNumber && dto.roomNumber !== before.roomNumber
            ? `Doctor room changed ${before.roomNumber} → ${dto.roomNumber}`
            : 'Doctor profile updated',
        meta,
      });
    }
    return this.findOne(id);
  }

  async setAvailability(userId: string, isAvailable: boolean, meta: RequestMeta): Promise<Doctor> {
    const doctor = await this.repo.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found for this user');
    if (doctor.isAvailable !== isAvailable) {
      await this.repo.update(doctor.id, { isAvailable });
      await this.audit.log({
        userId,
        action: AuditAction.UPDATE,
        module: AUDIT_MODULES.DOCTORS,
        entity: 'Doctor',
        entityId: doctor.id,
        oldValue: { isAvailable: doctor.isAvailable },
        newValue: { isAvailable },
        description: isAvailable ? 'Doctor is accepting patients' : 'Doctor stopped accepting patients',
        meta,
      });
    }
    return this.findOne(doctor.id);
  }

  async setServices(id: string, serviceIds: string[], actorId: string, meta: RequestMeta): Promise<Doctor> {
    const before = await this.findOne(id);
    await this.repo.manager.transaction(async (manager) => {
      await this.replaceServices(manager, id, serviceIds);
      await this.audit.log(
        {
          userId: actorId,
          action: AuditAction.UPDATE,
          module: AUDIT_MODULES.DOCTORS,
          entity: 'DoctorService',
          entityId: id,
          oldValue: { serviceIds: (before.services ?? []).map((s) => s.id) },
          newValue: { serviceIds },
          description: 'Doctor services reassigned',
          meta,
        },
        manager,
      );
    });
    return this.findOne(id);
  }

  async replaceServices(manager: EntityManager, doctorId: string, serviceIds: string[]): Promise<void> {
    if (serviceIds.length) {
      const found = await manager.getRepository(MedicalService).count({ where: { id: In(serviceIds) } });
      if (found !== serviceIds.length) throw new BadRequestException('One or more services do not exist');
    }
    const repo = manager.getRepository(DoctorService);
    await repo.delete({ doctorId });
    if (serviceIds.length) await repo.insert(serviceIds.map((serviceId) => ({ doctorId, serviceId })));
  }

  /** Replace the doctor set of a single service (used by services module). */
  async replaceDoctorsOfService(manager: EntityManager, serviceId: string, doctorIds: string[]): Promise<void> {
    if (doctorIds.length) {
      const found = await manager.getRepository(Doctor).count({ where: { id: In(doctorIds) } });
      if (found !== doctorIds.length) throw new BadRequestException('One or more doctors do not exist');
    }
    const repo = manager.getRepository(DoctorService);
    await repo.delete({ serviceId });
    if (doctorIds.length) await repo.insert(doctorIds.map((doctorId) => ({ doctorId, serviceId })));
  }

}
