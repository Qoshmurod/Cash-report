import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { AuditAction } from '../../common/constants/enums';
import { paginated, Paginated } from '../../common/dto/paginated';
import { escapeLike, resolveSort } from '../../common/dto/pagination-query.dto';
import { RequestMeta } from '../../common/types/auth.types';
import { AUDIT_MODULES } from '../audit/audit.constants';
import { AuditService, diffObjects } from '../audit/audit.service';
import { Department } from '../departments/entities/department.entity';
import { DoctorsService } from '../doctors/doctors.service';
import { Doctor } from '../doctors/entities/doctor.entity';
import { CreateServiceDto, ServiceQueryDto, UpdateServiceDto } from './dto/service.dto';
import { ServicePriceHistory } from './entities/service-price-history.entity';
import { MedicalService } from './entities/service.entity';

const SORTS = { createdAt: 's.createdAt', name: 's.name', price: 's.price', code: 's.code' };
const FIELDS = ['departmentId', 'name', 'nameRu', 'code', 'price', 'durationMinutes', 'description', 'isActive'];

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(MedicalService) private readonly repo: Repository<MedicalService>,
    @InjectRepository(ServicePriceHistory) private readonly history: Repository<ServicePriceHistory>,
    private readonly dataSource: DataSource,
    private readonly doctors: DoctorsService,
    private readonly audit: AuditService,
  ) {}

  private withRelations(qb: SelectQueryBuilder<MedicalService>): SelectQueryBuilder<MedicalService> {
    return qb
      .leftJoinAndSelect('s.department', 'dep')
      .leftJoinAndSelect('s.doctorServices', 'ds')
      .leftJoinAndSelect('ds.doctor', 'doc')
      .leftJoin('doc.user', 'du')
      .addSelect(['du.id', 'du.firstName', 'du.lastName', 'du.middleName', 'du.phone', 'du.status', 'du.avatar']);
  }

  static present(service: MedicalService): MedicalService {
    service.doctors = (service.doctorServices ?? [])
      .map((ds) => ds.doctor)
      .filter((d): d is Doctor => Boolean(d));
    delete service.doctorServices;
    return service;
  }

  async findAll(query: ServiceQueryDto): Promise<Paginated<MedicalService>> {
    const idsQb = this.repo.createQueryBuilder('s').leftJoin('s.department', 'dep').select('s.id', 'id');
    if (query.departmentId) idsQb.andWhere('s.departmentId = :dep', { dep: query.departmentId });
    if (query.isActive !== undefined) idsQb.andWhere('s.isActive = :a', { a: query.isActive });
    if (query.search) {
      idsQb.andWhere("(s.name ILIKE :s ESCAPE '\\' OR s.nameRu ILIKE :s ESCAPE '\\' OR s.code ILIKE :s ESCAPE '\\')", {
        s: `%${escapeLike(query.search)}%`,
      });
    }
    const sort = resolveSort(query.sortBy, SORTS);
    idsQb.orderBy(sort, query.sortOrder).addOrderBy('s.id');
    const total = await idsQb.getCount();
    if (!query.all) idsQb.offset(query.skip).limit(query.limit);
    const ids = (await idsQb.getRawMany<{ id: string }>()).map((r) => r.id);
    const limit = query.all ? Math.max(total, 1) : query.limit;
    if (!ids.length) return paginated([], total, query.page, limit);
    const rows = await this.withRelations(this.repo.createQueryBuilder('s')).where('s.id IN (:...ids)', { ids }).getMany();
    const byId = new Map(rows.map((s) => [s.id, ServicesService.present(s)]));
    return paginated(ids.map((id) => byId.get(id)).filter((s): s is MedicalService => Boolean(s)), total, query.page, limit);
  }

  async findOne(id: string): Promise<MedicalService> {
    const service = await this.withRelations(this.repo.createQueryBuilder('s')).where('s.id = :id', { id }).getOne();
    if (!service) throw new NotFoundException('Service not found');
    return ServicesService.present(service);
  }

  async create(dto: CreateServiceDto, actorId: string, meta: RequestMeta): Promise<MedicalService> {
    await this.assertDepartment(dto.departmentId);
    if (await this.repo.exists({ where: { code: dto.code } })) throw new ConflictException(`Service code ${dto.code} already exists`);
    const id = await this.dataSource.transaction(async (manager) => {
      const { doctorIds, ...fields } = dto;
      const repo = manager.getRepository(MedicalService);
      const service = await repo.save(repo.create({ ...fields, isActive: dto.isActive ?? true }));
      if (doctorIds?.length) await this.doctors.replaceDoctorsOfService(manager, service.id, doctorIds);
      await this.audit.log(
        {
          userId: actorId,
          action: AuditAction.CREATE,
          module: AUDIT_MODULES.SERVICES,
          entity: 'Service',
          entityId: service.id,
          newValue: { ...fields, doctorIds: doctorIds ?? [] },
          description: `Service created: ${service.name} (${service.code})`,
          meta,
        },
        manager,
      );
      return service.id;
    });
    return this.findOne(id);
  }

  async update(id: string, dto: UpdateServiceDto, actorId: string, meta: RequestMeta): Promise<MedicalService> {
    const service = await this.repo.findOne({ where: { id } });
    if (!service) throw new NotFoundException('Service not found');
    if (dto.departmentId) await this.assertDepartment(dto.departmentId);
    if (dto.code && dto.code !== service.code && (await this.repo.exists({ where: { code: dto.code } }))) {
      throw new ConflictException(`Service code ${dto.code} already exists`);
    }
    const before = { ...service };
    Object.assign(service, dto);
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(MedicalService).save(service);
      const priceChanged = dto.price !== undefined && Number(dto.price) !== Number(before.price);
      if (priceChanged) {
        await manager.getRepository(ServicePriceHistory).insert({
          serviceId: id,
          oldPrice: before.price,
          newPrice: service.price,
          changedById: actorId,
        });
        await this.audit.log(
          {
            userId: actorId,
            action: AuditAction.PRICE_CHANGE,
            module: AUDIT_MODULES.SERVICES,
            entity: 'Service',
            entityId: id,
            oldValue: { price: before.price },
            newValue: { price: service.price },
            description: `Price changed for ${service.name}: ${before.price} → ${service.price}`,
            meta,
          },
          manager,
        );
      }
      const diff = diffObjects(before, service, FIELDS.filter((f) => f !== 'price'));
      if (Object.keys(diff.newValue).length) {
        await this.audit.log(
          {
            userId: actorId,
            action: AuditAction.UPDATE,
            module: AUDIT_MODULES.SERVICES,
            entity: 'Service',
            entityId: id,
            ...diff,
            description: `Service updated: ${service.name}`,
            meta,
          },
          manager,
        );
      }
    });
    return this.findOne(id);
  }

  async deactivate(id: string, actorId: string, meta: RequestMeta): Promise<{ ok: true }> {
    const service = await this.repo.findOne({ where: { id } });
    if (!service) throw new NotFoundException('Service not found');
    if (service.isActive) {
      await this.repo.update(id, { isActive: false });
      await this.audit.log({
        userId: actorId,
        action: AuditAction.DELETE,
        module: AUDIT_MODULES.SERVICES,
        entity: 'Service',
        entityId: id,
        oldValue: { isActive: true },
        newValue: { isActive: false },
        description: `Service deactivated: ${service.name}`,
        meta,
      });
    }
    return { ok: true };
  }

  async setDoctors(id: string, doctorIds: string[], actorId: string, meta: RequestMeta): Promise<MedicalService> {
    const before = await this.findOne(id);
    await this.dataSource.transaction(async (manager) => {
      await this.doctors.replaceDoctorsOfService(manager, id, doctorIds);
      await this.audit.log(
        {
          userId: actorId,
          action: AuditAction.UPDATE,
          module: AUDIT_MODULES.SERVICES,
          entity: 'DoctorService',
          entityId: id,
          oldValue: { doctorIds: (before.doctors ?? []).map((d) => d.id) },
          newValue: { doctorIds },
          description: `Doctors reassigned for ${before.name}`,
          meta,
        },
        manager,
      );
    });
    return this.findOne(id);
  }

  async priceHistory(id: string): Promise<ServicePriceHistory[]> {
    if (!(await this.repo.exists({ where: { id } }))) throw new NotFoundException('Service not found');
    return this.history
      .createQueryBuilder('h')
      .leftJoin('h.changedBy', 'u')
      .addSelect(['u.id', 'u.firstName', 'u.lastName'])
      .where('h.serviceId = :id', { id })
      .orderBy('h.changedAt', 'DESC')
      .getMany();
  }

  private async assertDepartment(id: string): Promise<void> {
    const exists = await this.dataSource.getRepository(Department).exists({ where: { id } });
    if (!exists) throw new BadRequestException('Department does not exist');
  }
}
