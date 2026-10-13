import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword } from '../../../common/validators/password.validator';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  oldPassword: string;

  @ApiProperty({ description: 'Min 8 characters, at least one letter and one digit' })
  @IsStrongPassword()
  newPassword: string;
}
