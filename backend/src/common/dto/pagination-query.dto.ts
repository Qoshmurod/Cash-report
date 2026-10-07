import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PAGINATION } from '../constants/app.constants';
import { SortOrder } from '../constants/enums';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: PAGINATION.DEFAULT_PAGE, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = PAGINATION.DEFAULT_PAGE;

  @ApiPropertyOptional({ default: PAGINATION.DEFAULT_LIMIT, minimum: 1, maximum: PAGINATION.MAX_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION.MAX_LIMIT)
  limit: number = PAGINATION.DEFAULT_LIMIT;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  sortBy?: string;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

/** Resolves a user supplied sortBy against a whitelist (column expression per key). */
export const resolveSort = (
  sortBy: string | undefined,
  whitelist: Record<string, string>,
  fallback = 'createdAt',
): string => whitelist[sortBy ?? fallback] ?? whitelist[fallback];

export const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (m) => `\\${m}`);
