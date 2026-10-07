import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/constants/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReqMeta } from '../../common/decorators/request-meta.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { CancelKioskRequestDto, CreateKioskRequestDto, KioskRequestQueryDto } from './dto/kiosk.dto';
import { KioskService } from './kiosk.service';

@ApiTags('Kiosk')
@ApiBearerAuth()
@Controller('kiosk')
export class KioskController {
  constructor(private readonly kiosk: KioskService) {}

  @Get('catalog')
  @Roles(Role.KIOSK, Role.ADMIN, Role.REGISTRAR)
  @ApiOperation({ summary: 'Departments with bookable services (≥1 available doctor)' })
  catalog() {
    return this.kiosk.catalog();
  }

  @Post('requests')
  @Roles(Role.KIOSK)
  @ApiOperation({ summary: 'Patient self-registration from the touchscreen → registrar inbox' })
  create(@Body() dto: CreateKioskRequestDto, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.kiosk.create(dto, user, meta);
  }
}

@ApiTags('Kiosk requests')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.REGISTRAR)
@Controller('kiosk-requests')
export class KioskRequestsController {
  constructor(private readonly kiosk: KioskService) {}

  @Get()
  findAll(@Query() query: KioskRequestQueryDto) {
    return this.kiosk.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.kiosk.findOne(id);
  }

  @Post(':id/claim')
  @HttpCode(HttpStatus.OK)
  claim(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.kiosk.claim(id, user);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelKioskRequestDto,
    @CurrentUser() user: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.kiosk.cancel(id, dto.reason, user, meta);
  }
}
