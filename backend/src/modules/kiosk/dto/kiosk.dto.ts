import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID, Length, Matches, MaxLength } from 'class-validator';
import { KIOSK_LIMITS } from '../../../common/constants/app.constants';
import { Gender, KioskRequestStatus } from '../../../common/constants/enums';
import { DateRangeQueryDto } from '../../../common/dto/date-range-query.dto';
import { EmptyToNull, ToArray, Trim } from '../../../common/dto/transforms';
import { PHONE_PATTERN } from '../../users/dto/user.dto';

export class CreateKioskRequestDto {
  @ApiProperty() @Trim() @IsString() @Length(1, 100) firstName: string;
  @ApiProperty() @Trim() @IsString() @Length(1, 100) lastName: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @EmptyToNull() @IsString() @MaxLength(100) middleName?: string | null;
  @ApiProperty({ example: '+998901234567' }) @Trim() @Matches(PHONE_PATTERN, { message: 'phone must be a valid phone number' }) phone: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @EmptyToNull() @IsDateString() birthDate?: string | null;
  @ApiPropertyOptional({ enum: Gender, nullable: true }) @IsOptional() @EmptyToNull() @IsEnum(Gender) gender?: Gender | null;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(KIOSK_LIMITS.MAX_SERVICES)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  serviceIds: string[];
}

export class KioskRequestQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ enum: KioskRequestStatus, isArray: true, description: 'Comma separated; default NEW,IN_REVIEW' })
  @IsOptional()
  @ToArray()
  @IsEnum(KioskRequestStatus, { each: true })
  status?: KioskRequestStatus[];
}

export class CancelKioskRequestDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
