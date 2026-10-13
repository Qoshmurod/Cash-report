import { Access } from '../../common/decorators/access.decorator';
import { Section } from '../../common/constants/sections';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../common/constants/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReqMeta } from '../../common/decorators/request-meta.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DateRangeQueryDto } from '../../common/dto/date-range-query.dto';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { DayClosingsService } from './day-closings.service';
import { CloseDayDto } from './dto/payment.dto';

@ApiTags('Day closings')
@ApiBearerAuth()
@Access(Section.DAY_CLOSE)
@Controller('day-closings')
export class DayClosingsController {
  constructor(private readonly closings: DayClosingsService) {}

  @Get()
  @ApiOperation({ summary: 'History of day closings' })
  findAll(@Query() query: DateRangeQueryDto) {
    return this.closings.findAll(query);
  }

  @Get('pending')
  @ApiOperation({ summary: "Cash still \"to'lov jarayonda\" — what closing the day would settle" })
  pending() {
    return this.closings.preview();
  }

  @Post()
  @ApiOperation({ summary: 'Kunni yopish: settle all pending cash and re-book it as CARD' })
  close(@Body() dto: CloseDayDto, @CurrentUser() user: AuthUser, @ReqMeta() meta: RequestMeta) {
    return this.closings.close(dto.note, user, meta);
  }
}
