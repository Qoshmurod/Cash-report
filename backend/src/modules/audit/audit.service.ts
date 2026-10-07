import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditAction } from '../../common/constants/enums';
import { paginated, Paginated } from '../../common/dto/paginated';
import { escapeLike, resolveSort } from '../../common/dto/pagination-query.dto';
import { RequestMeta } from '../../common/types/auth.types';
import { dayRangeToUtc } from '../../common/utils/time.util';
import { SettingsService } from '../settings/settings.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditEntry {
  userId: string | null;
  action: AuditAction;
  module: string;
  entity: string;
  entityId?: string | null;
  oldValue?: object | null;
  newValue?: object | null;
  description?: string | null;
  meta?: RequestMeta | null;
}

const SENSITIVE_KEYS = new Set(['passwordHash', 'password', 'newPassword', 'oldPassword', 'tokenHash', 'refreshToken', 'accessToken']);
const IMAGE_PLACEHOLDER = '[image]';

/** Strips secrets and heavy base64 blobs before persisting diffs. */
const sanitize = (value: object | null | undefined): Record<string, unknown> | null => {
  if (!value) return null;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key)) continue;
    if (typeof v === 'string' && v.startsWith('data:image/')) out[key] = IMAGE_PLACEHOLDER;
    else if (v instanceof Date) out[key] = v.toISOString();
    else out[key] = v;
  }
  return out;
};

/** Computes {old,new} containing only changed keys. */
export const diffObjects = (
  before: object,
  after: object,
  keys?: string[],
): { oldValue: Record<string, unknown>; newValue: Record<string, unknown> } => {
  const b = before as Record<string, unknown>;
  const a = after as Record<string, unknown>;
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  for (const key of keys ?? Object.keys(a)) {
    if (JSON.stringify(b[key]) !== JSON.stringify(a[key])) {
      oldValue[key] = b[key];
      newValue[key] = a[key];
    }
  }
  return { oldValue, newValue };
};

const SORTS = { createdAt: 'a.createdAt', action: 'a.action', module: 'a.module' };

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Writes an audit row. Pass the transaction's EntityManager so the audit
   * entry commits/rolls back together with the business change.
   */
  async log(entry: AuditEntry, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(AuditLog) : this.repo;
    const row = repo.create({
      userId: entry.userId,
      action: entry.action,
      module: entry.module,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      oldValue: sanitize(entry.oldValue),
      newValue: sanitize(entry.newValue),
      description: entry.description?.slice(0, 500) ?? null,
      ip: entry.meta?.ip ?? null,
      userAgent: entry.meta?.userAgent ?? null,
    });
    if (manager) {
      await repo.save(row);
      return;
    }
    try {
      await repo.save(row);
    } catch (error) {
      // Stand-alone audit writes must never break the user's request.
      this.logger.error(`Failed to write audit log: ${(error as Error).message}`);
    }
  }

  async findAll(query: AuditQueryDto): Promise<Paginated<AuditLog>> {
    const tz = await this.settings.getTimezone();
    const qb = this.repo
      .createQueryBuilder('a')
      .leftJoin('a.user', 'u')
      .addSelect(['u.id', 'u.login', 'u.firstName', 'u.lastName', 'u.role']);
    if (query.action) qb.andWhere('a.action = :action', { action: query.action });
    if (query.module) qb.andWhere('a.module = :module', { module: query.module });
    if (query.userId) qb.andWhere('a.userId = :userId', { userId: query.userId });
    if (query.entityId) qb.andWhere('a.entityId = :entityId', { entityId: query.entityId });
    const range = dayRangeToUtc(tz, query.dateFrom, query.dateTo);
    if (range.from) qb.andWhere('a.createdAt >= :from', { from: range.from });
    if (range.to) qb.andWhere('a.createdAt < :to', { to: range.to });
    if (query.search) {
      qb.andWhere(
        "(a.description ILIKE :s ESCAPE '\\' OR a.entity ILIKE :s ESCAPE '\\' OR u.login ILIKE :s ESCAPE '\\' OR u.lastName ILIKE :s ESCAPE '\\')",
        { s: `%${escapeLike(query.search)}%` },
      );
    }
    qb.orderBy(resolveSort(query.sortBy, SORTS), query.sortOrder).skip(query.skip).take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    return paginated(items, total, query.page, query.limit);
  }
}
