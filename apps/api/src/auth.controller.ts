import { Body, Controller, Get, Post, Res, Req, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import * as argon2 from 'argon2';
import { Response } from 'express';
import { requiredEnv } from './config';

@Controller('auth')
export class AuthController {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  @Post('login')
  async login(@Body() body: { login: string; password: string }, @Res({ passthrough: true }) res: Response, @Req() req: any) {
    const login = String(body.login || '').trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { login }, include: { role: { include: { permissions: true } } } });
    if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, String(body.password || '')))) {
      await this.prisma.loginHistory.create({ data: { loginText: login, status: 'FAIL', ip: req.ip, note: 'Invalid credentials' } });
      throw new UnauthorizedException('INVALID_LOGIN');
    }
    const payload = { sub: user.id, login: user.login, role: user.role.name, owner: user.isOwner };
    const access = this.jwt.sign(payload, { secret: requiredEnv('JWT_ACCESS_SECRET'), expiresIn: '30m' });
    res.cookie('access_token', access, { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', maxAge: 30*60*1000 });
    await this.prisma.loginHistory.create({ data: { userId: user.id, loginText: user.login, roleName: user.role.name, status: 'SUCCESS', ip: req.ip } });
    return { user: { id: user.id, name: user.name, login: user.login, role: user.role.name, isOwner: user.isOwner } };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return { ok: true };
  }

  @Get('me')
  async me(@Req() req: any) {
    const token = req.cookies?.access_token;
    if (!token) throw new UnauthorizedException('AUTH_REQUIRED');
    try {
      const p = this.jwt.verify(token, { secret: requiredEnv('JWT_ACCESS_SECRET') });
      const user = await this.prisma.user.findUnique({ where: { id: p.sub }, include: { role: { include: { permissions: true } }, departments: true } });
      if (!user) throw new UnauthorizedException('AUTH_REQUIRED');
      return {
        user: { id: user.id, name: user.name, login: user.login, role: user.role.name, isOwner: user.isOwner },
        permissions: user.role.permissions.map(x => x.permissionId),
        departments: user.departments.map(x => x.deptKey)
      };
    } catch { throw new UnauthorizedException('AUTH_REQUIRED'); }
  }
}
