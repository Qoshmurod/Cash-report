import { Controller, Get, Param, ParseEnumPipe, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportType, Role } from '../../common/constants/enums';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReqMeta } from '../../common/decorators/request-meta.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, RequestMeta } from '../../common/types/auth.types';
import { ExportQueryDto } from '../exports/dto/export-query.dto';
import { ExportsService } from '../exports/exports.service';
import { PaymentQueryDto } from '../payments/dto/payment.dto';
import { QueueReportQueryDto, RevenueQueryDto, StatsQueryDto } from './dto/report.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly exportsService: ExportsService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Admin dashboard KPIs & charts' })
  dashboard() {
    return this.reports.dashboard();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue series by period (cash-flow basis, net of refunds)' })
  revenue(@Query() query: RevenueQueryDto) {
    return this.reports.revenueSeries(query);
  }

  @Get('payments')
  payments(@Query() query: PaymentQueryDto) {
    return this.reports.paymentsReport(query);
  }

  @Get('services')
  services(@Query() query: StatsQueryDto) {
    return this.reports.serviceStats(query);
  }

  @Get('doctors')
  doctors(@Query() query: StatsQueryDto) {
    return this.reports.doctorStats(query);
  }

  @Get('departments')
  departments(@Query() query: StatsQueryDto) {
    return this.reports.departmentStats(query);
  }

  @Get('queues')
  queues(@Query() query: QueueReportQueryDto) {
    return this.reports.queueReport(query);
  }

  @Get('export/:type')
  @ApiOperation({ summary: 'Download a report as .xlsx or .pdf (honours the same filters)' })
  async export(
    @Param('type', new ParseEnumPipe(ReportType)) type: ReportType,
    @Query() query: ExportQueryDto,
    @CurrentUser() user: AuthUser,
    @ReqMeta() meta: RequestMeta,
  ): Promise<StreamableFile> {
    const file = await this.exportsService.export(type, query, user.id, meta);
    return new StreamableFile(file.buffer, {
      type: file.mime,
      disposition: `attachment; filename="${file.filename}"`,
      length: file.buffer.length,
    });
  }
}
