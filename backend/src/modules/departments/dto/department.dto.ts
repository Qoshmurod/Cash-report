import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Length, Matches, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { EmptyToNull, ToBoolean, Trim } from '../../../common/dto/transforms';

const upper = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim().toUpperCase() : value);

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Kardiologiya' }) @Trim() @IsString() @Length(2, 150) name: string;
  @ApiPropertyOptional({ example: 'Кардиология', nullable: true }) @IsOptional() @EmptyToNull() @IsString() @MaxLength(150) nameRu?: string | null;

  @ApiProperty({ example: 'CARD' })
  @Transform(upper)
  @IsString()
  @Length(2, 20)
  @Matches(/^[A-Z0-9_-]+$/)
  code: string;

  @ApiProperty({ example: 'A', description: '1-3 upper-case latin letters, unique' })
  @Transform(upper)
  @IsString()
  @Matches(/^[A-Z]{1,3}$/, { message: 'queuePrefix must be 1-3 latin letters' })
  queuePrefix: string;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @EmptyToNull() @IsString() @MaxLength(2000) description?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}

export class DepartmentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @ToBoolean() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ description: 'Return all rows without pagination' }) @IsOptional() @ToBoolean() @IsBoolean() all?: boolean;
}
