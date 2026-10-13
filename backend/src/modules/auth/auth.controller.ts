import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AllowWithoutPasswordChange } from '../../common/decorators/allow-password-change.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ReqMeta } from '../../common/decorators/request-meta.decorator';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { buildConfig } from '../../config/configuration';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto, RefreshTokenDto } from './dto/refresh-token.dto';

const throttle = buildConfig().throttle;
const LOGIN_THROTTLE = { default: { limit: throttle.loginLimit, ttl: throttle.ttlSeconds * 1000 } };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle(LOGIN_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with login/password → access + refresh tokens' })
  login(@Body() dto: LoginDto, @ReqMeta() meta: RequestMeta) {
    return this.auth.login(dto, meta);
  }

  @Public()
  @Throttle(LOGIN_THROTTLE)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token' })
  refresh(@Body() dto: RefreshTokenDto, @ReqMeta() meta: RequestMeta) {
    return this.auth.refresh(dto.refreshToken, meta);
  }

  @ApiBearerAuth()
  @AllowWithoutPasswordChange()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: AuthUser, @Body() dto: LogoutDto, @ReqMeta() meta: RequestMeta) {
    return this.auth.logout(user, dto.refreshToken, meta);
  }

  @ApiBearerAuth()
  @AllowWithoutPasswordChange()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @ApiBearerAuth()
  @AllowWithoutPasswordChange()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto, @ReqMeta() meta: RequestMeta) {
    return this.auth.changePassword(user, dto, meta);
  }
}
