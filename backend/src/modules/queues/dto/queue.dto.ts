import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { QueueStatus } from '../../../common/constants/enums';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ToArray } from '../../../common/dto/transforms';

export class QueueQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: QueueStatus, isArray: true, description: 'Comma separated' })
  @IsOptional()
  @ToArray()
  @IsEnum(QueueStatus, { each: true })
  status?: QueueStatus[];

  @ApiPropertyOptional({ description: 'YYYY-MM-DD, default today' }) @IsOptional() @IsDateString() date?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() doctorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() departmentId?: string;
}

export class MyQueueQueryDto {
  @ApiPropertyOptional({ description: 'YYYY-MM-DD, default today' }) @IsOptional() @IsDateString() date?: string;
}

export class BoardQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() departmentId?: string;
}

export class CompleteTicketDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) complaint?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) diagnosis?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10000) notes?: string;
}

export class CancelTicketDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class TransferTicketDto {
  @ApiProperty() @IsUUID() doctorId: string;
}
