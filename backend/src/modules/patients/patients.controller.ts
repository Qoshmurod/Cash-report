import { Access } from '../../common/decorators/access.decorator';
import { Section } from '../../common/constants/sections';
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
  @Access(Section.CLIENTS, Section.REGISTRATION, Section.CONTRACTS)
  @ApiOperation({ summary: 'Search patients by name / phone / patient code / passport' })
  findAll(@Query() query: PatientQueryDto) {
    return this.patients.findAll(query);
  }

  @Get('check-duplicates')
  @Access(Section.CLIENTS, Section.REGISTRATION, Section.CONTRACTS)
  @ApiOperation({ summary: 'Possible duplicates by phone, passport or name + birth date' })
  checkDuplicates(@Query() query: DuplicateCheckQueryDto) {
    return this.patients.findDuplicates(query);
  }

  @Get(':id')
  @Access(Section.CLIENTS, Section.REGISTRATION, Section.CONTRACTS, Section.DOCTOR_CABINET)
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.patients.assertDoctorAccess(user, id);
    return this.patients.findOne(id);
  }

  @Get(':id/history')
  @Access(Section.CLIENTS, Section.REGISTRATION, Section.CONTRACTS, Section.DOCTOR_CABINET)
  async history(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.patients.assertDoctorAccess(user, id);
    return this.patients.history(id);
  }

  @Post()
  @Access(Section.CLIENTS, Section.REGISTRATION, Section.CONTRACTS)
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.patients.create(dto, user.id, meta);
  }

  @Patch(':id')
  @Access(Section.CLIENTS, Section.REGISTRATION, Section.CONTRACTS)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.patients.update(id, dto, user.id, meta);
  }
}
