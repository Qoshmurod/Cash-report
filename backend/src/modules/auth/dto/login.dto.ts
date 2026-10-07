import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../../../common/dto/transforms';

export class LoginDto {
  @ApiProperty({ example: 'admin01' })
  @Trim()
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  login: string;

  @ApiProperty({ example: 'admin01' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}
