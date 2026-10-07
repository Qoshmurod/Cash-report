import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction } from '../../common/constants/enums';
import { paginated, Paginated } from '../../common/dto/paginated';
import { escapeLike, resolveSort } from '../../common/dto/pagination-query.dto';
import { RequestMeta } from '../../common/types/auth.types';
import { AUDIT_MODULES } from '../audit/audit.constants';
import { AuditService, diffObjects } from '../audit/audit.service';
import { CreateDepartmentDto, DepartmentQueryDto, UpdateDepartmentDto } from './dto/department.dto';
import { Department } from './entities/department.entity';

const SORTS = { createdAt: 'd.createdAt', name: 'd.name', code: 'd.code', sortOrder: 'd.sortOrder' };
const FIELDS = ['name', 'nameRu', 'code', 'queuePrefix', 'description', 'isActive', 'sortOrder'];

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department) private readonly repo: Repository<Department>,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: DepartmentQueryDto): Promise<Paginated<Department>> {
    const qb = this.repo
      .createQueryBuilder('d')
      .loadRelationCountAndMap('d.servicesCount', 'd.services', 's', (sq) => sq.where('s.isActive = true'));
    if (query.isActive !== undefined) qb.andWhere('d.isActive = :a', { a: query.isActive });
    if (query.search) {
      qb.andWhere("(d.name ILIKE :s ESCAPE '\\' OR d.nameRu ILIKE :s ESCAPE '\\' OR d.code ILIKE :s ESCAPE '\\')", {
        s: `%${escapeLike(query.search)}%`,
      });
    }
    const sortBy = query.sortBy ?? 'sortOrder';
    qb.orderBy(resolveSort(sortBy, SORTS), query.sortBy ? query.sortOrder : 'ASC').addOrderBy('d.name', 'ASC');
    if (!query.all) qb.skip(query.skip).take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    return paginated(items, total, query.page, query.all ? Math.max(total, 1) : query.limit);
  }

  async findOne(id: string): Promise<Department> {
    const dep = await this.repo
      .createQueryBuilder('d')
      .loadRelationCountAndMap('d.servicesCount', 'd.services', 's', (sq) => sq.where('s.isActive = true'))
      .where('d.id = :id', { id })
      .getOne();
    if (!dep) throw new NotFoundException('Department not found');
    return dep;
  }

  async create(dto: CreateDepartmentDto, actorId: string, meta: RequestMeta): Promise<Department> {
    await this.assertUnique(dto.code, dto.queuePrefix);
    const dep = await this.repo.save(this.repo.create({ ...dto, isActive: dto.isActive ?? true, sortOrder: dto.sortOrder ?? 0 }));
    await this.audit.log({
      userId: actorId,
      action: AuditAction.CREATE,
      module: AUDIT_MODULES.DEPARTMENTS,
      entity: 'Department',
      entityId: dep.id,
      newValue: { name: dep.name, code: dep.code, queuePrefix: dep.queuePrefix },
      description: `Department created: ${dep.name}`,
      meta,
    });
    return this.findOne(dep.id);
  }

  async update(id: string, dto: UpdateDepartmentDto, actorId: string, meta: RequestMeta): Promise<Department> {
    const dep = await this.repo.findOne({ where: { id } });
    if (!dep) throw new NotFoundException('Department not found');
    await this.assertUnique(dto.code, dto.queuePrefix, id);
    const before = { ...dep };
    Object.assign(dep, dto);
    await this.repo.save(dep);
    const diff = diffObjects(before, dep, FIELDS);
    if (Object.keys(diff.newValue).length) {
      await this.audit.log({
        userId: actorId,
        action: AuditAction.UPDATE,
        module: AUDIT_MODULES.DEPARTMENTS,
        entity: 'Department',
        entityId: id,
        ...diff,
        description: `Department updated: ${dep.name}`,
        meta,
      });
    }
    return this.findOne(id);
  }

  async deactivate(id: string, actorId: string, meta: RequestMeta): Promise<{ ok: true }> {
    const dep = await this.repo.findOne({ where: { id } });
    if (!dep) throw new NotFoundException('Department not found');
    if (dep.isActive) {
      await this.repo.update(id, { isActive: false });
      await this.audit.log({
        userId: actorId,
        action: AuditAction.DELETE,
        module: AUDIT_MODULES.DEPARTMENTS,
        entity: 'Department',
        entityId: id,
        oldValue: { isActive: true },
        newValue: { isActive: false },
        description: `Department deactivated: ${dep.name}`,
        meta,
      });
    }
    return { ok: true };
  }

  private async assertUnique(code?: string, prefix?: string, excludeId?: string): Promise<void> {
    if (code) {
      const qb = this.repo.createQueryBuilder('d').where('d.code = :code', { code });
      if (excludeId) qb.andWhere('d.id <> :id', { id: excludeId });
      if (await qb.getExists()) throw new ConflictException(`Department code ${code} already exists`);
    }
    if (prefix) {
      const qb = this.repo.createQueryBuilder('d').where('d.queuePrefix = :prefix', { prefix });
      if (excludeId) qb.andWhere('d.id <> :id', { id: excludeId });
      if (await qb.getExists()) throw new ConflictException(`Queue prefix ${prefix} is already used`);
    }
  }
}
