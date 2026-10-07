import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { QueueStatus, ReportPeriod } from '../../../common/constants/enums';
import { DateRangeQueryDto } from '../../../common/dto/date-range-query.dto';
import { ToArray } from '../../../common/dto/transforms';

export class RevenueQueryDto {
  @ApiPropertyOptional({ enum: ReportPeriod, default: ReportPeriod.DAILY })
  @IsOptional()
  @IsEnum(ReportPeriod)
  period: ReportPeriod = ReportPeriod.DAILY;

  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
}

export class StatsQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTo?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() departmentId?: string;
}

export class QueueReportQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() doctorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() departmentId?: string;

  @ApiPropertyOptional({ enum: QueueStatus, isArray: true })
  @IsOptional()
  @ToArray()
  @IsEnum(QueueStatus, { each: true })
  status?: QueueStatus[];
}
