import { Access } from '../../common/decorators/access.decorator';
import { Section } from '../../common/constants/sections';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/constants/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReqMeta } from '../../common/decorators/request-meta.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { LoginHistoryQueryDto } from '../login-history/dto/login-history-query.dto';
import { LoginHistoryService } from '../login-history/login-history.service';
import { CreateUserDto, ResetPasswordDto, UpdateUserDto, UserQueryDto, SetSectionsDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('Users (staff)')
@ApiBearerAuth()
@Access(Section.STAFF)
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly loginHistory: LoginHistoryService,
  ) {}

  @Get()
  @Access(Section.STAFF, Section.PERMISSIONS)
  findAll(@Query() query: UserQueryDto, @CurrentUser() actor: AuthUser) {
    return this.users.findAll(query, actor.login);
  }

  @Get(':id')
  @Access(Section.STAFF, Section.PERMISSIONS)
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    await this.users.assertVisible(id, actor.login);
    return this.users.findOne(id);
  }

  @Put(':id/grantable-sections')
  @Access(Section.STAFF)
  @ApiOperation({ summary: "Super admin: bo'limlar this user may hand out (needs the permissions section)" })
  async setGrantable(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetSectionsDto,
    @CurrentUser() actor: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.users.setGrantable(id, dto.sections ?? [], actor, meta);
  }

  @Put(':id/sections')
  @Access(Section.STAFF, Section.PERMISSIONS)
  @ApiOperation({ summary: "Super admin: bo'limlarga ruxsat (null = role defaults)" })
  async setSections(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetSectionsDto,
    @CurrentUser() actor: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.users.setSections(id, dto.sections ?? null, actor, meta);
  }

  @Post()
  @ApiOperation({ summary: 'Create employee (doctor profile required when role = DOCTOR)' })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.users.create(dto, actor.id, meta);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    await this.users.assertVisible(id, actor.login);
    return this.users.update(id, dto, actor.id, meta);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a temporary password; user must change it on next login' })
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() actor: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    await this.users.assertVisible(id, actor.login);
    return this.users.resetPassword(id, dto.newPassword, actor.id, meta);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate employee (soft delete) and revoke sessions' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser, @ReqMeta() meta: RequestMeta) {
    await this.users.assertVisible(id, actor.login);
    return this.users.deactivate(id, actor.id, meta);
  }

  @Get(':id/login-history')
  async loginHistoryOf(@Param('id', ParseUUIDPipe) id: string, @Query() query: LoginHistoryQueryDto, @CurrentUser() actor: AuthUser) {
    await this.users.assertVisible(id, actor.login);
    return this.loginHistory.findAll(query, id);
  }
}
