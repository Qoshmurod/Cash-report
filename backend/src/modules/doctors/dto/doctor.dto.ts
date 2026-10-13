import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ToBoolean, Trim } from '../../../common/dto/transforms';
import { WorkSchedule } from '../entities/doctor.entity';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const WEEKDAYS = ['1', '2', '3', '4', '5', '6', '7'];

export const isValidWorkSchedule = (value: unknown): value is WorkSchedule => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.entries(value as Record<string, unknown>).every(([day, interval]) => {
    if (!WEEKDAYS.includes(day)) return false;
    if (interval === null) return true;
    if (typeof interval !== 'object') return false;
    const { start, end } = interval as { start?: unknown; end?: unknown };
    return typeof start === 'string' && typeof end === 'string' && TIME.test(start) && TIME.test(end) && start < end;
  });
};

export function IsWorkSchedule(options?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) =>
    registerDecorator({
      name: 'isWorkSchedule',
      target: object.constructor,
      propertyName: propertyName as string,
      options: { message: 'workSchedule must map weekday "1".."7" to {start:"HH:mm", end:"HH:mm"} or null', ...options },
      validator: { validate: (v: unknown) => v === undefined || isValidWorkSchedule(v) },
    });
}

export class DoctorProfileDto {
  @ApiProperty({ example: 'Kardiolog' })
  @Trim()
  @IsString()
  @Length(2, 150)
  specialty: string;

  @ApiProperty({ example: '204' })
  @Trim()
  @IsString()
  @Length(1, 20)
  roomNumber: string;

  @ApiPropertyOptional({ example: { '1': { start: '09:00', end: '17:00' } } })
  @IsOptional()
  @IsObject()
  @IsWorkSchedule()
  workSchedule?: WorkSchedule;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  serviceIds?: string[];
}

export class UpdateDoctorDto {
  @ApiPropertyOptional() @IsOptional() @Trim() @IsString() @Length(2, 150) specialty?: string;
  @ApiPropertyOptional() @IsOptional() @Trim() @IsString() @Length(1, 20) roomNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() @IsWorkSchedule() workSchedule?: WorkSchedule;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAvailable?: boolean;
}

export class AvailabilityDto {
  @ApiProperty()
  @IsBoolean()
  isAvailable: boolean;
}

export class DoctorServicesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  serviceIds: string[];
}

export class DoctorQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() serviceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() departmentId?: string;
  @ApiPropertyOptional() @IsOptional() @ToBoolean() @IsBoolean() available?: boolean;
  @ApiPropertyOptional({ description: 'Return all rows without pagination' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  all?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) specialty?: string;
}

