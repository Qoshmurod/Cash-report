import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  NotEquals,
  ValidateNested,
} from 'class-validator';
import { EmptyToNull, ToBoolean, Trim } from '../../../common/dto/transforms';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { CreatePatientDto } from '../../patients/dto/patient.dto';

export class CreateContractDto {
  @ApiProperty({ example: 'SH-2026/040' }) @Trim() @IsString() @Length(1, 100) contractNumber: string;
  @ApiPropertyOptional() @IsOptional() @EmptyToNull() @IsString() @MaxLength(255) organization?: string | null;
  @ApiPropertyOptional() @IsOptional() @EmptyToNull() @IsString() @MaxLength(2000) note?: string | null;
  @ApiPropertyOptional({ description: 'Shartnoma summasi (UZS)' })
  @IsOptional()
  @EmptyToNull()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  contractAmount?: number | null;

  @ApiPropertyOptional() @IsOptional() @EmptyToNull() @IsDateString() startDate?: string | null;
  @ApiPropertyOptional() @IsOptional() @EmptyToNull() @IsDateString() endDate?: string | null;

  @ApiPropertyOptional({ default: 10, description: 'Warn when balance ≤ this % of total deposited' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  warningThresholdPercent?: number;

  @ApiPropertyOptional({ description: 'First transfer received with the contract' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  initialDeposit?: number;
}

export class UpdateContractDto extends PartialType(CreateContractDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ContractQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @ToBoolean() @IsBoolean() active?: boolean;
  @ApiPropertyOptional({ description: 'Only contracts at / below their warning threshold' }) @IsOptional() @ToBoolean() @IsBoolean() lowBalance?: boolean;
}

export class AddDepositDto {
  @ApiProperty({ example: 50000000, description: 'Negative for a correction' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @NotEquals(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Default: today' }) @IsOptional() @IsDateString() depositDate?: string;
  @ApiPropertyOptional() @IsOptional() @EmptyToNull() @IsString() @MaxLength(100) documentNumber?: string | null;
  @ApiPropertyOptional() @IsOptional() @EmptyToNull() @IsString() @MaxLength(1000) note?: string | null;
}

export class AddContractPatientsDto {
  @ApiPropertyOptional({ type: [String], description: 'Existing patients' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  patientIds?: string[];

  @ApiPropertyOptional({ type: CreatePatientDto, description: 'Create a new patient and add to the list' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePatientDto)
  patient?: CreatePatientDto;

  @ApiPropertyOptional() @IsOptional() @EmptyToNull() @IsString() @MaxLength(255) note?: string | null;
}

export class GuaranteeTemplateDto {
  @ApiProperty() @Trim() @IsString() @Length(2, 200) name: string;
  @ApiProperty({ description: 'Placeholders: {shartnoma_raqami} {tashkilot} {summa} {shartnoma_summasi} {xat_raqami} {sana}' })
  @IsString()
  @Length(10, 20000)
  body: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateGuaranteeDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() templateId?: string;
  @ApiProperty() @Trim() @IsString() @Length(1, 100) letterNumber: string;
  @ApiProperty() @IsDateString() letterDate: string;
  @ApiProperty({ description: 'Qarz limiti (UZS)' }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() amount: number;
  @ApiPropertyOptional() @IsOptional() @EmptyToNull() @IsDateString() validUntil?: string | null;
  @ApiProperty({ description: 'Kafolat xati matni' }) @IsString() @Length(10, 20000) body: string;
}

export class GuaranteeDecisionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) note?: string;
}
