import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Gender } from '../../../common/constants/enums';
import { DateRangeQueryDto } from '../../../common/dto/date-range-query.dto';
import { EmptyToNull, Trim } from '../../../common/dto/transforms';
import { PersonFieldsDto, PHONE_PATTERN } from '../../users/dto/user.dto';

const MAX_AGE = 150;

export class CreatePatientDto extends PersonFieldsDto {
  @ApiProperty({ example: '+998901234567' })
  @Trim()
  @Matches(PHONE_PATTERN, { message: 'phone must be a valid phone number' })
  declare phone: string;

  @ApiPropertyOptional({ nullable: true, example: 'AA1234567' })
  @IsOptional()
  @EmptyToNull()
  @IsString()
  @MaxLength(50)
  passport?: string | null;
}

export class UpdatePatientDto extends PartialType(CreatePatientDto) {}

export class PatientQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ enum: Gender }) @IsOptional() @IsEnum(Gender) gender?: Gender;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(MAX_AGE) ageFrom?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(MAX_AGE) ageTo?: number;
}

export class DuplicateCheckQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() birthDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) passport?: string;
}
