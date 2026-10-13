import { SetMetadata } from '@nestjs/common';

export const ALLOW_WITHOUT_PASSWORD_CHANGE_KEY = 'allowWithoutPasswordChange';
/** Route stays reachable while the user still has `mustChangePassword = true`. */
export const AllowWithoutPasswordChange = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ALLOW_WITHOUT_PASSWORD_CHANGE_KEY, true);
