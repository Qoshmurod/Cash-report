import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReqMeta } from '../../common/decorators/request-meta.decorator';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { LoginHistoryQueryDto } from '../login-history/dto/login-history-query.dto';
import { LoginHistoryService } from '../login-history/login-history.service';
import { UpdateProfileDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(
    private readonly users: UsersService,
    private readonly loginHistory: LoginHistoryService,
  ) {}

  @Get()
  me(@CurrentUser() user: AuthUser) {
    return this.users.findOne(user.id);
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto, @ReqMeta() meta: RequestMeta) {
    return this.users.updateProfile(user.id, dto, meta);
  }

  @Get('login-history')
  history(@CurrentUser() user: AuthUser, @Query() query: LoginHistoryQueryDto) {
    return this.loginHistory.findAll(query, user.id);
  }
}
