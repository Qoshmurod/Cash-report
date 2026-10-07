import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { EmptyToNull, ToBoolean, Trim } from '../../../common/dto/transforms';

const MAX_PRICE = 1_000_000_000;
const MAX_DURATION_MINUTES = 24 * 60;

export class CreateServiceDto {
  @ApiProperty() @IsUUID() departmentId: string;
  @ApiProperty({ example: 'Kardiolog ko‘rigi' }) @Trim() @IsString() @Length(2, 200) name: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @EmptyToNull() @IsString() @MaxLength(200) nameRu?: string | null;

  @ApiProperty({ example: 'CARD-001' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Length(2, 30)
  @Matches(/^[A-Z0-9_-]+$/)
  code: string;

  @ApiProperty({ example: 150000 }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(MAX_PRICE) price: number;
  @ApiProperty({ example: 20 }) @Type(() => Number) @IsInt() @Min(1) @Max(MAX_DURATION_MINUTES) durationMinutes: number;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @EmptyToNull() @IsString() @MaxLength(2000) description?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  doctorIds?: string[];
}

export class UpdateServiceDto extends PartialType(OmitType(CreateServiceDto, ['doctorIds'] as const)) {}

export class ServiceDoctorsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  doctorIds: string[];
}

export class ServiceQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @ToBoolean() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ description: 'Return all rows without pagination' }) @IsOptional() @ToBoolean() @IsBoolean() all?: boolean;
}
