import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/constants/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReqMeta } from '../../common/decorators/request-meta.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { DoctorsService } from './doctors.service';
import { AvailabilityDto, DoctorQueryDto, DoctorServicesDto, UpdateDoctorDto } from './dto/doctor.dto';

@ApiTags('Doctors')
@ApiBearerAuth()
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctors: DoctorsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.REGISTRAR)
  @ApiOperation({ summary: 'List doctors (filter by service / department / availability)' })
  findAll(@Query() query: DoctorQueryDto) {
    return this.doctors.findAll(query);
  }

  @Get('me')
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: 'Current doctor profile with services' })
  me(@CurrentUser() user: AuthUser) {
    return this.doctors.findByUserId(user.id);
  }

  @Patch('me/availability')
  @Roles(Role.DOCTOR)
  setAvailability(@CurrentUser() user: AuthUser, @Body() dto: AvailabilityDto, @ReqMeta() meta: RequestMeta) {
    return this.doctors.setAvailability(user.id, dto.isAvailable, meta);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.doctors.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update specialty / room / schedule / availability (room change is audited)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDoctorDto,
    @CurrentUser() user: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.doctors.update(id, dto, user.id, meta);
  }

  @Put(':id/services')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Replace the set of services this doctor provides' })
  setServices(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DoctorServicesDto,
    @CurrentUser() user: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.doctors.setServices(id, dto.serviceIds, user.id, meta);
  }
}
