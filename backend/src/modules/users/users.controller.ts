import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/constants/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReqMeta } from '../../common/decorators/request-meta.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { LoginHistoryQueryDto } from '../login-history/dto/login-history-query.dto';
import { LoginHistoryService } from '../login-history/login-history.service';
import { CreateUserDto, ResetPasswordDto, UpdateUserDto, UserQueryDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('Users (staff)')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly loginHistory: LoginHistoryService,
  ) {}

  @Get()
  findAll(@Query() query: UserQueryDto) {
    return this.users.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create employee (doctor profile required when role = DOCTOR)' })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.users.create(dto, actor.id, meta);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.users.update(id, dto, actor.id, meta);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a temporary password; user must change it on next login' })
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() actor: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.users.resetPassword(id, dto.newPassword, actor.id, meta);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate employee (soft delete) and revoke sessions' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.users.deactivate(id, actor.id, meta);
  }

  @Get(':id/login-history')
  loginHistoryOf(@Param('id', ParseUUIDPipe) id: string, @Query() query: LoginHistoryQueryDto) {
    return this.loginHistory.findAll(query, id);
  }
}
