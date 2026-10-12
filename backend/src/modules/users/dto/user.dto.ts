import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Gender, Role, UserStatus } from '../../../common/constants/enums';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { EmptyToNull, Trim } from '../../../common/dto/transforms';
import { IsBase64Image } from '../../../common/validators/base64-image.validator';
import { IsStrongPassword } from '../../../common/validators/password.validator';
import { DoctorProfileDto } from '../../doctors/dto/doctor.dto';

export const PHONE_PATTERN = /^\+?[0-9\s\-()]{7,20}$/;

/** Personal profile fields shared by users (staff) and — in a separate DTO — patients. */
export class PersonFieldsDto {
  @ApiProperty() @Trim() @IsString() @Length(1, 100) firstName: string;
  @ApiProperty() @Trim() @IsString() @Length(1, 100) lastName: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @EmptyToNull() @IsString() @MaxLength(100) middleName?: string | null;
  @ApiPropertyOptional({ nullable: true, example: '1990-05-21' }) @IsOptional() @EmptyToNull() @IsDateString() birthDate?: string | null;
  @ApiPropertyOptional({ enum: Gender, nullable: true }) @IsOptional() @EmptyToNull() @IsEnum(Gender) gender?: Gender | null;
  @ApiPropertyOptional({ nullable: true, example: '+998901234567' })
  @IsOptional()
  @EmptyToNull()
  @ValidateIf((_o, v) => v !== null)
  @Matches(PHONE_PATTERN, { message: 'phone must be a valid phone number' })
  phone?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @EmptyToNull() @ValidateIf((_o, v) => v !== null) @IsEmail() @MaxLength(150) email?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @EmptyToNull() @IsString() @MaxLength(500) address?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @EmptyToNull() @IsString() @MaxLength(150) profession?: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'data:image/(png|jpeg|webp);base64,... max 2 MB' })
  @IsOptional()
  @IsBase64Image()
  avatar?: string | null;
}

export class CreateUserDto extends PersonFieldsDto {
  @ApiProperty({ example: 'doctor05' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @Length(3, 64)
  @Matches(/^[a-z0-9._-]+$/, { message: 'login may contain only latin letters, digits, dot, dash, underscore' })
  login: string;

  @ApiProperty()
  @IsStrongPassword()
  password: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ type: DoctorProfileDto, description: 'Required when role = DOCTOR' })
  @ValidateIf((o: CreateUserDto) => o.role === Role.DOCTOR || o.doctor !== undefined)
  @ValidateNested()
  @Type(() => DoctorProfileDto)
  doctor?: DoctorProfileDto;
}

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['login', 'password'] as const)) {}

export class UpdateProfileDto extends PartialType(OmitType(PersonFieldsDto, ['profession'] as const)) {}

export class ResetPasswordDto {
  @ApiProperty()
  @IsStrongPassword()
  newPassword: string;
}

export class UserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Role }) @IsOptional() @IsEnum(Role) role?: Role;
  @ApiPropertyOptional({ enum: UserStatus }) @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
}
