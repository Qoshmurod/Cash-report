import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/constants/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReqMeta } from '../../common/decorators/request-meta.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { CreatePatientDto, DuplicateCheckQueryDto, PatientQueryDto, UpdatePatientDto } from './dto/patient.dto';
import { PatientsService } from './patients.service';

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @ApiOperation({ summary: 'Search patients by name / phone / patient code / passport' })
  findAll(@Query() query: PatientQueryDto) {
    return this.patients.findAll(query);
  }

  @Get('check-duplicates')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @ApiOperation({ summary: 'Possible duplicates by phone, passport or name + birth date' })
  checkDuplicates(@Query() query: DuplicateCheckQueryDto) {
    return this.patients.findDuplicates(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.DOCTOR)
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.patients.assertDoctorAccess(user, id);
    return this.patients.findOne(id);
  }

  @Get(':id/history')
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.DOCTOR)
  async history(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.patients.assertDoctorAccess(user, id);
    return this.patients.history(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.REGISTRAR)
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.patients.create(dto, user.id, meta);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.patients.update(id, dto, user.id, meta);
  }
}
