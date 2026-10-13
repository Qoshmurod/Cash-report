import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ERROR_CODES } from '../constants/app.constants';
import { ALLOW_WITHOUT_PASSWORD_CHANGE_KEY } from '../decorators/allow-password-change.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthUser } from '../types/auth.types';

/** Blocks everything except auth essentials until a forced password change is done. */
@Injectable()
export class PasswordChangeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;
    if (this.reflector.getAllAndOverride<boolean>(ALLOW_WITHOUT_PASSWORD_CHANGE_KEY, targets)) return true;
    const user = context.switchToHttp().getRequest<Request & { user?: AuthUser }>().user;
    if (user?.mustChangePassword) {
      throw new ForbiddenException({
        code: ERROR_CODES.PASSWORD_CHANGE_REQUIRED,
        message: 'Password change required before using the system',
      });
    }
    return true;
  }
}
