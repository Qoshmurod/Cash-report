import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { AuditAction, UserStatus } from '../../common/constants/enums';
import { AuthUser, JwtAccessPayload, JwtRefreshPayload, RequestMeta } from '../../common/types/auth.types';
import { durationToSeconds } from '../../common/utils/duration.util';
import { AppConfig } from '../../config/configuration';
import { AUDIT_MODULES } from '../audit/audit.constants';
import { AuditService } from '../audit/audit.service';
import { LoginHistoryService } from '../login-history/login-history.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordService } from '../../common/security/password.service';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

const FAILURE = {
  NOT_FOUND: 'USER_NOT_FOUND',
  BAD_PASSWORD: 'INVALID_PASSWORD',
  INACTIVE: 'USER_INACTIVE',
  BLOCKED: 'USER_BLOCKED',
} as const;

@Injectable()
export class AuthService {
  private readonly cfg: AppConfig;

  constructor(
    config: ConfigService,
    private readonly jwt: JwtService,
    private readonly passwords: PasswordService,
    private readonly usersService: UsersService,
    private readonly loginHistory: LoginHistoryService,
    private readonly audit: AuditService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshToken) private readonly tokens: Repository<RefreshToken>,
  ) {
    this.cfg = config.getOrThrow<AppConfig>('app');
  }

  async login(dto: LoginDto, meta: RequestMeta): Promise<AuthResult> {
    const login = dto.login.toLowerCase();
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('lower(u.login) = :login', { login })
      .getOne();

    const passwordOk = await this.passwords.verify(dto.password, user?.passwordHash);
    let failure: string | null = null;
    if (!user) failure = FAILURE.NOT_FOUND;
    else if (!passwordOk) failure = FAILURE.BAD_PASSWORD;
    else if (user.status === UserStatus.BLOCKED) failure = FAILURE.BLOCKED;
    else if (user.status !== UserStatus.ACTIVE) failure = FAILURE.INACTIVE;

    if (failure || !user) {
      await this.loginHistory.record({ userId: user?.id ?? null, loginAttempt: login, success: false, failureReason: failure, meta });
      await this.audit.log({
        userId: user?.id ?? null,
        action: AuditAction.LOGIN_FAILED,
        module: AUDIT_MODULES.AUTH,
        entity: 'User',
        entityId: user?.id ?? null,
        description: `Failed login for "${login}" (${failure})`,
        meta,
      });
      // Deliberately generic: never reveal whether the login exists.
      if (failure === FAILURE.BLOCKED || failure === FAILURE.INACTIVE) {
        throw new UnauthorizedException('Account is disabled. Contact the administrator.');
      }
      throw new UnauthorizedException('Invalid login or password');
    }

    const history = await this.loginHistory.record({ userId: user.id, loginAttempt: login, success: true, meta });
    await this.users.update(user.id, { lastLoginAt: new Date() });
    await this.audit.log({
      userId: user.id,
      action: AuditAction.LOGIN,
      module: AUDIT_MODULES.AUTH,
      entity: 'User',
      entityId: user.id,
      description: `${user.login} logged in`,
      meta,
    });
    return this.issueTokens(user.id, history.id, meta);
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthResult> {
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtRefreshPayload>(refreshToken, { secret: this.cfg.jwt.refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const stored = await this.tokens.findOne({ where: { id: payload.jti } });
    if (!stored || stored.userId !== payload.sub || stored.tokenHash !== sha256(refreshToken)) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (stored.revokedAt) {
      // Reuse of a rotated token → likely theft. Kill every session of this user.
      await this.revokeAll(stored.userId);
      await this.audit.log({
        userId: stored.userId,
        action: AuditAction.LOGOUT,
        module: AUDIT_MODULES.AUTH,
        entity: 'RefreshToken',
        entityId: stored.id,
        description: 'Refresh token reuse detected — all sessions revoked',
        meta,
      });
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (stored.expiresAt.getTime() < Date.now()) throw new UnauthorizedException('Refresh token expired');

    const user = await this.users.findOne({ where: { id: stored.userId } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.revokeAll(stored.userId);
      throw new UnauthorizedException('User account is not active');
    }
    const result = await this.issueTokens(user.id, stored.loginHistoryId, meta);
    const newJti = (this.jwt.decode<JwtRefreshPayload>(result.refreshToken)).jti;
    await this.tokens.update(stored.id, { revokedAt: new Date(), replacedById: newJti });
    return result;
  }

  async logout(user: AuthUser, refreshToken: string | undefined, meta: RequestMeta): Promise<{ ok: true }> {
    if (refreshToken) {
      const payload = this.jwt.decode<JwtRefreshPayload | null>(refreshToken);
      if (payload?.jti && payload.sub === user.id) {
        const stored = await this.tokens.findOne({ where: { id: payload.jti, userId: user.id } });
        if (stored) {
          if (!stored.revokedAt) await this.tokens.update(stored.id, { revokedAt: new Date() });
          await this.loginHistory.markLogout(stored.loginHistoryId);
        }
      }
    }
    await this.audit.log({
      userId: user.id,
      action: AuditAction.LOGOUT,
      module: AUDIT_MODULES.AUTH,
      entity: 'User',
      entityId: user.id,
      description: `${user.login} logged out`,
      meta,
    });
    return { ok: true };
  }

  async changePassword(authUser: AuthUser, dto: ChangePasswordDto, meta: RequestMeta): Promise<{ ok: true }> {
    const user = await this.users.createQueryBuilder('u').addSelect('u.passwordHash').where('u.id = :id', { id: authUser.id }).getOne();
    if (!user) throw new UnauthorizedException();
    if (!(await this.passwords.verify(dto.oldPassword, user.passwordHash))) {
      throw new ForbiddenException('Old password is incorrect');
    }
    if (dto.oldPassword === dto.newPassword) throw new ForbiddenException('New password must differ from the old one');
    await this.users.update(user.id, {
      passwordHash: await this.passwords.hash(dto.newPassword),
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    });
    // Other sessions are revoked; the current access token stays valid until expiry.
    await this.revokeAll(user.id);
    await this.audit.log({
      userId: user.id,
      action: AuditAction.PASSWORD_CHANGE,
      module: AUDIT_MODULES.AUTH,
      entity: 'User',
      entityId: user.id,
      description: `${user.login} changed password`,
      meta,
    });
    return { ok: true };
  }

  async revokeAll(userId: string): Promise<void> {
    await this.tokens.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  me(userId: string): Promise<User> {
    return this.usersService.findOne(userId);
  }

  private async issueTokens(userId: string, loginHistoryId: string | null, meta: RequestMeta): Promise<AuthResult> {
    const user = await this.usersService.findOne(userId);
    const accessPayload: JwtAccessPayload = { sub: user.id, role: user.role, login: user.login };
    const expiresIn = durationToSeconds(this.cfg.jwt.expiresIn);
    const refreshTtl = durationToSeconds(this.cfg.jwt.refreshExpiresIn);
    const jti = randomUUID();
    const accessToken = await this.jwt.signAsync(accessPayload, { expiresIn });
    const refreshPayload: JwtRefreshPayload = { sub: user.id, jti };
    const refreshToken = await this.jwt.signAsync(refreshPayload, { secret: this.cfg.jwt.refreshSecret, expiresIn: refreshTtl });
    await this.tokens.insert({
      id: jti,
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + refreshTtl * 1000),
      loginHistoryId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { accessToken, refreshToken, expiresIn, user };
  }

}
