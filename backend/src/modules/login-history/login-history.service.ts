import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { paginated, Paginated } from '../../common/dto/paginated';
import { escapeLike, resolveSort } from '../../common/dto/pagination-query.dto';
import { RequestMeta } from '../../common/types/auth.types';
import { dayRangeToUtc } from '../../common/utils/time.util';
import { parseUserAgent } from '../../common/utils/user-agent.util';
import { SettingsService } from '../settings/settings.service';
import { LoginHistoryQueryDto } from './dto/login-history-query.dto';
import { LoginHistory } from './entities/login-history.entity';

const SORTS = { createdAt: 'h.loginAt', loginAt: 'h.loginAt', logoutAt: 'h.logoutAt' };

@Injectable()
export class LoginHistoryService {
  constructor(
    @InjectRepository(LoginHistory) private readonly repo: Repository<LoginHistory>,
    private readonly settings: SettingsService,
  ) {}

  async record(params: {
    userId: string | null;
    loginAttempt: string;
    success: boolean;
    failureReason?: string | null;
    meta: RequestMeta;
  }): Promise<LoginHistory> {
    const ua = parseUserAgent(params.meta.userAgent);
    return this.repo.save(
      this.repo.create({
        userId: params.userId,
        loginAttempt: params.loginAttempt.slice(0, 100),
        success: params.success,
        failureReason: params.failureReason ?? null,
        ip: params.meta.ip,
        userAgent: params.meta.userAgent,
        browser: ua.browser,
        os: ua.os,
        device: ua.device,
      }),
    );
  }

  async markLogout(id: string | null): Promise<void> {
    if (!id) return;
    await this.repo.update({ id, logoutAt: IsNull() }, { logoutAt: new Date() });
  }

  async findAll(query: LoginHistoryQueryDto, forceUserId?: string): Promise<Paginated<LoginHistory>> {
    const tz = await this.settings.getTimezone();
    const qb = this.repo
      .createQueryBuilder('h')
      .leftJoin('h.user', 'u')
      .addSelect(['u.id', 'u.login', 'u.firstName', 'u.lastName', 'u.role']);
    const userId = forceUserId ?? query.userId;
    if (userId) qb.andWhere('h.userId = :userId', { userId });
    if (query.success !== undefined) qb.andWhere('h.success = :success', { success: query.success });
    const range = dayRangeToUtc(tz, query.dateFrom, query.dateTo);
    if (range.from) qb.andWhere('h.loginAt >= :from', { from: range.from });
    if (range.to) qb.andWhere('h.loginAt < :to', { to: range.to });
    if (query.search) {
      qb.andWhere("(h.loginAttempt ILIKE :s ESCAPE '\\' OR h.ip ILIKE :s ESCAPE '\\' OR h.browser ILIKE :s ESCAPE '\\')", {
        s: `%${escapeLike(query.search)}%`,
      });
    }
    qb.orderBy(resolveSort(query.sortBy, SORTS), query.sortOrder).skip(query.skip).take(query.limit);
    const [items, total] = await qb.getManyAndCount();
    return paginated(items, total, query.page, query.limit);
  }
}
