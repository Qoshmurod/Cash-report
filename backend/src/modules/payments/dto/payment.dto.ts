import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { PaymentMethod, PaymentStatus, SettlementStatus } from '../../../common/constants/enums';
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

  @ApiPropertyOptional({ enum: SettlementStatus, description: 'PENDING = cash not yet closed ("to\'lov jarayonda")' })
  @IsOptional()
  @IsEnum(SettlementStatus)
  settlementStatus?: SettlementStatus;

  @ApiPropertyOptional() @IsOptional() @IsUUID() contractId?: string;
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

export class RemoveItemsDto {
  @ApiProperty({ type: [String], description: 'Payment item ids to remove (patient paid for them by mistake)' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  itemIds: string[];

  @ApiProperty() @IsString() @Length(2, 500) reason: string;
}

export class CloseDayDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) note?: string;
}
