import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class DateRangeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '2026-09-01', description: 'Inclusive (server timezone)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-09-30', description: 'Inclusive (server timezone)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
