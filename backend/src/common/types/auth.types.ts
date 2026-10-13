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
  /** Effective bo'limlar (super admin: all). */
  sections: string[];
  isSuperAdmin: boolean;
  /** Bo'limlar this user may hand out to others (set by the super admin; needs the "permissions" section). */
  grantableSections: string[];
  doctorId: string | null;
}

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}
