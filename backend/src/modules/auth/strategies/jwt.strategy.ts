import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { UserStatus } from '../../../common/constants/enums';
import { AuthUser, JwtAccessPayload } from '../../../common/types/auth.types';
import { AppConfig } from '../../../config/configuration';
import { User } from '../../users/entities/user.entity';

/**
 * Validates the access token AND re-loads the user on every request, so a
 * deactivated/blocked user or a role change takes effect immediately.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<AppConfig>('app').jwt.secret,
    });
  }

  async validate(payload: JwtAccessPayload): Promise<AuthUser> {
    const user = await this.users.findOne({ where: { id: payload.sub }, relations: { doctor: true } });
    if (!user) throw new UnauthorizedException('User no longer exists');
    if (user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('User account is not active');
    return {
      id: user.id,
      login: user.login,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      mustChangePassword: user.mustChangePassword,
      doctorId: user.doctor?.id ?? null,
    };
  }
}
