import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { PaymentMethod, PaymentStatus } from '../../../common/constants/enums';
import { DateRangeQueryDto } from '../../../common/dto/date-range-query.dto';
import { ToArray } from '../../../common/dto/transforms';

export class PaymentQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ enum: PaymentStatus, isArray: true, description: 'Comma separated' })
  @IsOptional()
  @ToArray()
  @IsEnum(PaymentStatus, { each: true })
  status?: PaymentStatus[];

  @ApiPropertyOptional({ enum: PaymentMethod, isArray: true, description: 'Comma separated' })
  @IsOptional()
  @ToArray()
  @IsEnum(PaymentMethod, { each: true })
  method?: PaymentMethod[];

  @ApiPropertyOptional() @IsOptional() @IsUUID() doctorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() serviceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() patientId?: string;
}

export class AddPaymentDto {
  @ApiProperty({ example: 50000 }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() amount: number;
  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) method: PaymentMethod;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class RefundDto {
  @ApiPropertyOptional({ description: 'Default: everything still refundable' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @ApiProperty() @IsString() @Length(2, 500) reason: string;
}

export class CancelPaymentDto {
  @ApiProperty() @IsString() @Length(2, 500) reason: string;
}
