import { Access } from '../../common/decorators/access.decorator';
import { Section } from '../../common/constants/sections';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/constants/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReqMeta } from '../../common/decorators/request-meta.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { CreateServiceDto, ServiceDoctorsDto, ServiceQueryDto, UpdateServiceDto } from './dto/service.dto';
import { ServicesService } from './services.service';

@ApiTags('Services')
@ApiBearerAuth()
@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  findAll(@Query() query: ServiceQueryDto) {
    return this.services.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.services.findOne(id);
  }

  @Post()
  @Access(Section.SERVICES)
  create(@Body() dto: CreateServiceDto, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.services.create(dto, user.id, meta);
  }

  @Patch(':id')
  @Access(Section.SERVICES)
  @ApiOperation({ summary: 'Update service; a price change is recorded in price history and audit' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
    @CurrentUser() user: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.services.update(id, dto, user.id, meta);
  }

  @Delete(':id')
  @Access(Section.SERVICES)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.services.deactivate(id, user.id, meta);
  }

  @Put(':id/doctors')
  @Access(Section.SERVICES)
  setDoctors(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ServiceDoctorsDto,
    @CurrentUser() user: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.services.setDoctors(id, dto.doctorIds, user.id, meta);
  }

  @Get(':id/price-history')
  @Access(Section.SERVICES)
  priceHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.services.priceHistory(id);
  }
}
