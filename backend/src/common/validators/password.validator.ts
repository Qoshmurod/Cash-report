import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_POLICY } from '../constants/app.constants';

/** Min 8 chars, at least one letter and one digit. */
export const IsStrongPassword = (): PropertyDecorator =>
  applyDecorators(
    IsString(),
    MinLength(PASSWORD_POLICY.MIN_LENGTH),
    MaxLength(PASSWORD_POLICY.MAX_LENGTH),
    Matches(PASSWORD_POLICY.PATTERN, { message: 'password must contain at least one letter and one digit' }),
  );
