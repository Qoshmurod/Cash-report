# Roles & permissions

Authorization is enforced **on the backend** by global guards (the frontend guards are only UX):

1. `ThrottlerGuard` — rate limiting (global + stricter on `/auth/login`, `/auth/refresh`)
2. `JwtAuthGuard` — every route requires a valid access token unless marked `@Public()`;
   the user is re-loaded from the DB on every request, so a deactivated/blocked user is rejected immediately
3. `RolesGuard` — `@Roles(...)` on controllers/handlers
4. `PasswordChangeGuard` — while `mustChangePassword = true` only `/auth/me`, `/auth/change-password`,
   `/auth/logout`, `/auth/refresh` work (403 `PASSWORD_CHANGE_REQUIRED`)

Ownership rules on top of roles: a doctor may only read/act on tickets of their own queue and only open
patients who are (or were) in their queue.

## Matrix

| Area / action | ADMIN | REGISTRAR | DOCTOR | KIOSK | Public |
|---|:-:|:-:|:-:|:-:|:-:|
| Login / refresh / logout / me / change password / profile | ✅ | ✅ | ✅ | ✅ | login, refresh |
| Staff (users) CRUD, reset password, deactivate | ✅ | | | | |
| Doctors list / details | ✅ | ✅ | | | |
| Doctor profile edit, service assignment | ✅ | | | | |
| Own doctor profile, availability toggle | | | ✅ | | |
| Departments & services — read | ✅ | ✅ | ✅ | ✅ | |
| Departments & services — create/update/deactivate, price history | ✅ | | | | |
| Patients — search/create/update, duplicates check | ✅ | ✅ | | | |
| Patient details & history | ✅ | ✅ | own queue | | |
| Kiosk catalog | ✅ | ✅ | | ✅ | |
| Create kiosk request | | | | ✅ | |
| Kiosk inbox, claim, cancel | ✅ | ✅ | | | |
| Checkout (`/registrations`) | ✅ | ✅ | | | |
| Payments — list/details/receipt/PDF, top-up, cancel (unpaid) | ✅ | ✅ | | | |
| Refund | ✅ | | | | |
| Queue lists (all), cancel, transfer | ✅ | ✅ | | | |
| Requeue | ✅ | ✅ | own | | |
| My queue, call, start, complete, skip | ✅ (any) | | own | | |
| Queue board | | | | | ✅ |
| Reports, dashboard, exports | ✅ | | | | |
| Audit log, login history (all users) | ✅ | | | | |
| Settings — read | ✅ | ✅ | ✅ | ✅ | public subset |
| Settings — update | ✅ | | | | |
| Health | | | | | ✅ |

## Default accounts (seed)

| Login | Password | Role |
|---|---|---|
| `admin01` | `admin01` | ADMIN |
| `panel01` | `panel01` | KIOSK |
| `registrar01` | `registrar01` | REGISTRAR |
| `doctor01` … `doctor05` | same as login | DOCTOR |

With `NODE_ENV=production` the seeded accounts get `mustChangePassword = true`: the first login must set a
new password (min 8 chars, letters + digits) before anything else works. Admin password resets
(`POST /users/:id/reset-password`) also force a change on next login and revoke all sessions.

## Session security

* Access token: 15 min (HS256, `JWT_SECRET`). Refresh token: 7 days (`JWT_REFRESH_SECRET`), stored only as SHA-256.
* Refresh rotation on every use; re-using an already rotated refresh token revokes **all** sessions of that user.
* Password change / reset / deactivation revokes refresh tokens.
* Every login attempt (success and failure, with reason) is stored in `login_history`; logout stamps `logout_at`.
