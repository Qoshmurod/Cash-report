import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Length, Matches, MaxLength, ValidateNested } from 'class-validator';
import { IsBase64Image } from '../../../common/validators/base64-image.validator';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class WorkingHoursDto {
  @ApiPropertyOptional({ example: '08:00' })
  @Matches(TIME)
  start: string;

  @ApiPropertyOptional({ example: '18:00' })
  @Matches(TIME)
  end: string;
}

const isValidTimezone = (tz: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};
export const VALID_TZ = { isValidTimezone };

export class UpdateSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 150) hospitalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) address?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsBase64Image() logo?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) receiptHeader?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) receiptFooter?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) timezone?: string;
  @ApiPropertyOptional({ type: WorkingHoursDto }) @IsOptional() @ValidateNested() @Type(() => WorkingHoursDto) workingHours?: WorkingHoursDto;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() voiceAnnouncements?: boolean;
  @ApiPropertyOptional({ enum: ['uz', 'ru'] }) @IsOptional() @IsIn(['uz', 'ru']) announcementLanguage?: 'uz' | 'ru';
}
