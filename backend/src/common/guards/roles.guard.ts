import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Role } from '../constants/enums';
import { Section } from '../constants/sections';
import { ACCESS_KEY } from '../decorators/access.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../types/auth.types';

/**
 * @Access(sections) → the user needs one of those bo'limlar (super admin always passes).
 * Endpoints without @Access keep the role check (doctor / kiosk specific endpoints).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;
    const user = context.switchToHttp().getRequest<Request & { user?: AuthUser }>().user;
    const deny = () => {
      throw new ForbiddenException('Sizda bu bo‘limga ruxsat yo‘q');
    };
    const sections = this.reflector.getAllAndOverride<Section[] | undefined>(ACCESS_KEY, targets);
    if (sections?.length) {
      if (!user) return deny();
      if (user.isSuperAdmin || sections.some((s) => user.sections.includes(s))) return true;
      return deny();
    }
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);
    if (!roles || roles.length === 0) return true;
    if (!user || !(user.isSuperAdmin || roles.includes(user.role))) return deny();
    return true;
  }
}
