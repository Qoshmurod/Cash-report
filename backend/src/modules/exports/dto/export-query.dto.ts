import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { AuditAction, ExportFormat, Gender } from '../../../common/constants/enums';
import { DateRangeQueryDto } from '../../../common/dto/date-range-query.dto';
import { ToArray, ToBoolean } from '../../../common/dto/transforms';

/** Union of filters of every exportable report; each report uses the subset it understands. */
export class ExportQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.XLSX })
  @IsOptional()
  @IsEnum(ExportFormat)
  format: ExportFormat = ExportFormat.XLSX;

  @ApiPropertyOptional({ description: 'Payment or queue statuses (comma separated)' })
  @IsOptional()
  @ToArray()
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  status?: string[];

  @ApiPropertyOptional({ description: 'Payment methods (comma separated)' })
  @IsOptional()
  @ToArray()
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  method?: string[];

  @ApiPropertyOptional() @IsOptional() @IsUUID() doctorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() serviceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() patientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() userId?: string;
  @ApiPropertyOptional({ enum: AuditAction }) @IsOptional() @IsEnum(AuditAction) action?: AuditAction;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) module?: string;
  @ApiPropertyOptional() @IsOptional() @ToBoolean() @IsBoolean() success?: boolean;
  @ApiPropertyOptional({ enum: Gender }) @IsOptional() @IsEnum(Gender) gender?: Gender;
}
