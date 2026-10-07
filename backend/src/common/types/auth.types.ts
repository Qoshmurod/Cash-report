import { Role } from '../constants/enums';

/** Payload signed into the access token. */
export interface JwtAccessPayload {
  sub: string;
  role: Role;
  login: string;
}

export interface JwtRefreshPayload {
  sub: string;
  jti: string;
}

/** What `@CurrentUser()` returns — loaded from DB on every request by JwtStrategy. */
export interface AuthUser {
  id: string;
  login: string;
  role: Role;
  firstName: string;
  lastName: string;
  mustChangePassword: boolean;
  doctorId: string | null;
}

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}
