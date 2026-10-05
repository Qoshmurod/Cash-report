import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    if (req.path.endsWith('/health')) return true;
    const token = req.cookies?.access_token;
    if (!token) throw new UnauthorizedException('AUTH_REQUIRED');
    try {
      req.user = this.jwt.verify(token, { secret: process.env.JWT_ACCESS_SECRET || 'dev-secret' });
      return true;
    } catch { throw new UnauthorizedException('AUTH_REQUIRED'); }
  }
}
