import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CHECKOUT_LIMITS } from '../../../common/constants/app.constants';
import { PaymentMethod } from '../../../common/constants/enums';
import { EmptyToNull, Trim } from '../../../common/dto/transforms';
import { CreatePatientDto } from '../../patients/dto/patient.dto';

export class CheckoutItemDto {
  @ApiProperty() @IsUUID() serviceId: string;
  @ApiProperty() @IsUUID() doctorId: string;
}

export class CheckoutDto {
  @ApiProperty({ description: 'Client generated UUID per checkout attempt (duplicate payment protection)' })
  @IsString()
  @Matches(/^[A-Za-z0-9-]{8,64}$/)
  idempotencyKey: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() kioskRequestId?: string;

  @ApiPropertyOptional({ description: 'Existing patient (or provide `patient`)' })
  @ValidateIf((o: CheckoutDto) => !o.patient)
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ type: CreatePatientDto })
  @ValidateIf((o: CheckoutDto) => !o.patientId)
  @ValidateNested()
  @Type(() => CreatePatientDto)
  patient?: CreatePatientDto;

  @ApiProperty({ type: [CheckoutItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(CHECKOUT_LIMITS.MAX_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) method: PaymentMethod;

  @ApiProperty({ example: 230000 }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) paidAmount: number;

  @ApiPropertyOptional({ description: 'Required when method = CONTRACT' })
  @ValidateIf((o: CheckoutDto) => o.method === PaymentMethod.CONTRACT)
  @Trim()
  @IsString()
  @Length(1, 100)
  contractNumber?: string;

  @ApiPropertyOptional() @IsOptional() @EmptyToNull() @IsString() @MaxLength(255) contractOrganization?: string | null;
  @ApiPropertyOptional() @IsOptional() @EmptyToNull() @IsString() @MaxLength(1000) note?: string | null;
}
