# API Contract — Shifoxona Management System

> This document is the **source of truth** between backend (NestJS) and frontend (Nuxt).
> Base URL: `/api/v1`. Swagger UI: `/api/docs`. WebSocket (Socket.IO): namespace `/realtime`, path `/socket.io`.

## 1. Conventions

### 1.1 Response envelope

Every successful response:

```ts
interface ApiSuccess<T> {
  success: true
  data: T
  meta?: PageMeta          // only for paginated lists
}
interface PageMeta { page: number; limit: number; total: number; totalPages: number }
```

Every error (global exception filter):

```ts
interface ApiError {
  success: false
  error: {
    statusCode: number
    code: string            // e.g. 'VALIDATION_ERROR', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'BAD_REQUEST', 'TOO_MANY_REQUESTS', 'INTERNAL_ERROR', 'PASSWORD_CHANGE_REQUIRED'
    message: string         // human readable (English; frontend maps `code` to i18n)
    details?: unknown       // validation errors: string[]
    path: string
    timestamp: string       // ISO
  }
}
```

Binary endpoints (PDF/XLSX export) return the file directly (no envelope) with `Content-Disposition: attachment`.

### 1.2 Lists — pagination / search / sort

Query params common to every list endpoint:

| param | type | default |
|---|---|---|
| `page` | int ≥1 | 1 |
| `limit` | int 1..100 | 20 |
| `search` | string | – |
| `sortBy` | string (whitelisted per endpoint) | `createdAt` |
| `sortOrder` | `ASC` \| `DESC` | `DESC` |

Response `data` = array, `meta` = `PageMeta`.

### 1.3 Money & dates

- Money: integers in **UZS (so'm)**, JSON `number` (stored as `numeric(14,2)` in DB, serialized as number).
- Dates: ISO-8601 strings. Date-only fields (`birthDate`) are `YYYY-MM-DD`.
- Server timezone: `Asia/Tashkent` (configurable via `TIMEZONE`). "Today" is computed in that timezone.

### 1.4 Auth header

`Authorization: Bearer <accessToken>`. Access token TTL 15 min, refresh token TTL 7 days (rotated on every refresh, stored hashed in DB, revocable).

If the user has `mustChangePassword = true`, every endpoint except `GET /auth/me`, `POST /auth/change-password`, `POST /auth/logout`, `POST /auth/refresh` returns `403` with code `PASSWORD_CHANGE_REQUIRED`.

## 2. Enums

```ts
type Role = 'ADMIN' | 'DOCTOR' | 'REGISTRAR' | 'KIOSK'
type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
type Gender = 'MALE' | 'FEMALE'
type PaymentMethod = 'CASH' | 'CARD' | 'CONTRACT'           // UI: NAQD / KARTA / SHARTNOMA
type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'REFUNDED' | 'CANCELLED'
type PaymentTransactionType = 'PAYMENT' | 'REFUND'
type QueueStatus = 'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED'
type KioskRequestStatus = 'NEW' | 'IN_REVIEW' | 'PROCESSED' | 'CANCELLED'
type VisitStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_CHANGE'
                 | 'PAYMENT' | 'REFUND' | 'CANCEL' | 'QUEUE_CALL' | 'QUEUE_STATUS' | 'PRICE_CHANGE' | 'EXPORT'
type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly'
type ExportFormat = 'xlsx' | 'pdf'
type ReportType = 'payments' | 'patients' | 'services' | 'doctors' | 'queues' | 'audit' | 'login-history'
```

## 3. Models (JSON shapes)

```ts
interface User {
  id: string                 // uuid
  login: string
  role: Role
  status: UserStatus
  firstName: string
  lastName: string
  middleName: string | null
  birthDate: string | null
  gender: Gender | null
  phone: string | null
  email: string | null
  address: string | null
  profession: string | null
  avatar: string | null      // data URL "data:image/png;base64,..." (max 2 MB decoded, jpeg/png/webp)
  mustChangePassword: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  doctor?: Doctor | null     // present when role = DOCTOR
}

interface Doctor {
  id: string
  userId: string
  specialty: string
  roomNumber: string
  workSchedule: WorkSchedule   // see below
  isAvailable: boolean         // doctor currently accepting patients
  user?: Pick<User, 'id'|'firstName'|'lastName'|'middleName'|'phone'|'status'|'avatar'>
  services?: Service[]
  createdAt: string
  updatedAt: string
}
// key = ISO weekday 1..7 (1 = Monday). Missing/null = day off.
type WorkSchedule = Partial<Record<'1'|'2'|'3'|'4'|'5'|'6'|'7', { start: string; end: string } | null>>  // "09:00"

interface Department {
  id: string
  name: string            // uz
  nameRu: string | null
  code: string            // unique, e.g. "CARD"
  queuePrefix: string     // 1-3 upper letters, unique, e.g. "A"
  description: string | null
  isActive: boolean
  sortOrder: number
  servicesCount?: number
  createdAt: string
  updatedAt: string
}

interface Service {
  id: string
  departmentId: string
  department?: Department
  name: string
  nameRu: string | null
  code: string           // unique, e.g. "CARD-001"
  price: number
  durationMinutes: number
  description: string | null
  isActive: boolean
  doctors?: Doctor[]     // assigned doctors (with user)
  createdAt: string
  updatedAt: string
}

interface ServicePriceHistory {
  id: string; serviceId: string; oldPrice: number; newPrice: number
  changedBy: Pick<User,'id'|'firstName'|'lastName'> | null; changedAt: string
}

interface Patient {
  id: string
  patientCode: string        // human id, e.g. "P-000123" (unique, sequence based)
  firstName: string
  lastName: string
  middleName: string | null
  birthDate: string | null
  gender: Gender | null
  phone: string | null
  email: string | null
  address: string | null
  passport: string | null    // series+number / ID card / PINFL
  profession: string | null
  avatar: string | null
  createdBy?: Pick<User,'id'|'firstName'|'lastName'> | null
  createdAt: string
  updatedAt: string
}

interface KioskRequest {
  id: string
  number: number             // display "#1024" — global sequence
  status: KioskRequestStatus
  firstName: string
  lastName: string
  middleName: string | null
  phone: string
  birthDate: string | null
  gender: Gender | null
  items: KioskRequestItem[]
  totalAmount: number
  kioskUser?: Pick<User,'id'|'login'> | null
  processedBy?: Pick<User,'id'|'firstName'|'lastName'> | null
  processedAt: string | null
  paymentId: string | null
  matchedPatients?: Patient[]   // only in GET /kiosk-requests/:id — possible duplicates by phone / name+birthDate
  createdAt: string
}
interface KioskRequestItem { id: string; serviceId: string; service?: Service; serviceName: string; price: number }

interface Payment {
  id: string
  receiptNumber: string       // e.g. "R-20261001-0007"
  patientId: string
  patient?: Patient
  items: PaymentItem[]
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  refundedAmount: number
  method: PaymentMethod
  status: PaymentStatus
  contract?: Contract | null
  transactions?: PaymentTransaction[]
  queueTickets?: QueueTicket[]
  note: string | null
  createdBy?: Pick<User,'id'|'firstName'|'lastName'> | null
  createdAt: string
  updatedAt: string
}
interface PaymentItem {
  id: string; serviceId: string; serviceName: string; serviceCode: string
  departmentId: string; doctorId: string | null
  price: number; quantity: number; amount: number
  service?: Service; doctor?: Doctor
}
interface PaymentTransaction {
  id: string; type: PaymentTransactionType; method: PaymentMethod; amount: number
  note: string | null; createdBy?: Pick<User,'id'|'firstName'|'lastName'>; createdAt: string
}
interface Contract {
  id: string; contractNumber: string; organization: string | null; note: string | null; createdAt: string
}

interface QueueTicket {
  id: string
  ticketNumber: string       // "A19"
  prefix: string             // "A"
  sequence: number           // 19
  queueDate: string          // YYYY-MM-DD (tz Asia/Tashkent)
  status: QueueStatus
  patientId: string
  patient?: Pick<Patient,'id'|'patientCode'|'firstName'|'lastName'|'middleName'|'phone'|'birthDate'|'gender'>
  doctorId: string | null
  doctor?: Doctor
  departmentId: string
  department?: Department
  paymentId: string | null
  roomNumber: string | null  // room snapshot at creation, updated at call time
  services: { id: string; name: string }[]   // services on this ticket
  calledAt: string | null
  calledCount: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

interface Visit {
  id: string; queueTicketId: string; patientId: string; doctorId: string
  status: VisitStatus; startedAt: string; endedAt: string | null
  complaint: string | null; diagnosis: string | null; notes: string | null
}

interface AuditLog {
  id: string
  user?: Pick<User,'id'|'login'|'firstName'|'lastName'|'role'> | null
  action: AuditAction
  module: string            // 'users' | 'patients' | 'services' | 'payments' | 'queues' | 'auth' | ...
  entity: string            // 'Service'
  entityId: string | null
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  description: string | null
  ip: string | null
  userAgent: string | null
  createdAt: string
}

interface LoginHistory {
  id: string
  user?: Pick<User,'id'|'login'|'firstName'|'lastName'|'role'> | null
  loginAttempt: string      // the login string used
  success: boolean
  failureReason: string | null
  ip: string | null
  userAgent: string | null
  browser: string | null    // "Chrome 128"
  os: string | null         // "Linux"
  device: string | null     // "desktop" | "mobile" | "tablet"
  loginAt: string
  logoutAt: string | null
}

interface SystemSettings {
  hospitalName: string
  phone: string
  address: string
  logo: string | null           // data URL
  receiptHeader: string
  receiptFooter: string
  currency: string              // "UZS"
  timezone: string              // "Asia/Tashkent"
  workingHours: { start: string; end: string }
  voiceAnnouncements: boolean
  announcementLanguage: 'uz' | 'ru'
}
```

## 4. Endpoints

Roles column: who may call it. `public` = no token.

### 4.1 Auth — `/auth`

| Method | Path | Roles | Body / Query | Returns |
|---|---|---|---|---|
| POST | `/auth/login` | public (rate limited 10/min/IP) | `{ login, password }` | `{ accessToken, refreshToken, expiresIn: number(sec), user: User }` |
| POST | `/auth/refresh` | public | `{ refreshToken }` | same as login |
| POST | `/auth/logout` | any | `{ refreshToken? }` | `{ ok: true }` |
| GET | `/auth/me` | any | – | `User` |
| POST | `/auth/change-password` | any | `{ oldPassword, newPassword }` (min 8, letter+digit) | `{ ok: true }` — also revokes other refresh tokens |

### 4.2 Profile — `/profile`

| GET | `/profile` | any | – | `User` |
| PATCH | `/profile` | any | `{ firstName?, lastName?, middleName?, phone?, email?, address?, birthDate?, gender?, avatar? }` | `User` |
| GET | `/profile/login-history` | any | list params | `LoginHistory[]` paginated |

### 4.3 Users (staff) — `/users` (ADMIN)

| GET | `/users` | ADMIN | list + `role?`, `status?` ; sortBy: `createdAt,lastName,login,role` | `User[]` |
| GET | `/users/:id` | ADMIN | | `User` |
| POST | `/users` | ADMIN | `CreateUserDto` = User profile fields + `login`, `password`, `role`, `status?`, `doctor?: { specialty, roomNumber, workSchedule?, serviceIds?: string[] }` (required when role=DOCTOR) | `User` |
| PATCH | `/users/:id` | ADMIN | partial of profile fields + `role?`, `status?` (no password) | `User` |
| POST | `/users/:id/reset-password` | ADMIN | `{ newPassword }` → sets `mustChangePassword=true`, revokes tokens | `{ ok: true }` |
| DELETE | `/users/:id` | ADMIN | soft-deactivate (status=INACTIVE, revokes tokens). Cannot delete self. | `{ ok: true }` |
| GET | `/users/:id/login-history` | ADMIN | list params | `LoginHistory[]` |

### 4.4 Doctors — `/doctors`

| GET | `/doctors` | ADMIN, REGISTRAR | list + `serviceId?`, `departmentId?`, `available?=true` ; includes `user`, `services` | `Doctor[]` |
| GET | `/doctors/me` | DOCTOR | | `Doctor` (with services) |
| GET | `/doctors/:id` | ADMIN, REGISTRAR | | `Doctor` |
| PATCH | `/doctors/:id` | ADMIN | `{ specialty?, roomNumber?, workSchedule?, isAvailable? }` (room change is audited) | `Doctor` |
| PATCH | `/doctors/me/availability` | DOCTOR | `{ isAvailable: boolean }` | `Doctor` |
| PUT | `/doctors/:id/services` | ADMIN | `{ serviceIds: string[] }` (replace set) | `Doctor` |

### 4.5 Departments — `/departments`

| GET | `/departments` | any authenticated | list + `isActive?` (no pagination if `all=true`) | `Department[]` |
| GET | `/departments/:id` | any | | `Department` |
| POST | `/departments` | ADMIN | `{ name, nameRu?, code, queuePrefix, description?, isActive?, sortOrder? }` | `Department` |
| PATCH | `/departments/:id` | ADMIN | partial | `Department` |
| DELETE | `/departments/:id` | ADMIN | deactivates (isActive=false); 409 if has active services? No — deactivates department only | `{ ok: true }` |

### 4.6 Services — `/services`

| GET | `/services` | any authenticated | list + `departmentId?`, `isActive?`, `all=true` (unpaginated) ; sortBy `createdAt,name,price,code` | `Service[]` (with department, doctors) |
| GET | `/services/:id` | any | | `Service` |
| POST | `/services` | ADMIN | `{ departmentId, name, nameRu?, code, price, durationMinutes, description?, isActive?, doctorIds?: string[] }` | `Service` |
| PATCH | `/services/:id` | ADMIN | partial; price change → `ServicePriceHistory` row + audit `PRICE_CHANGE` | `Service` |
| DELETE | `/services/:id` | ADMIN | deactivate | `{ ok: true }` |
| PUT | `/services/:id/doctors` | ADMIN | `{ doctorIds: string[] }` | `Service` |
| GET | `/services/:id/price-history` | ADMIN | | `ServicePriceHistory[]` |

### 4.7 Patients — `/patients`

| GET | `/patients` | ADMIN, REGISTRAR | list + `gender?`, `ageFrom?`, `ageTo?`, `dateFrom?`, `dateTo?` (createdAt). `search` matches name / phone / patientCode / passport | `Patient[]` |
| GET | `/patients/:id` | ADMIN, REGISTRAR, DOCTOR | | `Patient` |
| GET | `/patients/:id/history` | ADMIN, REGISTRAR, DOCTOR | | `{ payments: Payment[], tickets: QueueTicket[], visits: Visit[] }` |
| GET | `/patients/check-duplicates` | ADMIN, REGISTRAR | `phone?`, `firstName?`, `lastName?`, `birthDate?`, `passport?` | `Patient[]` |
| POST | `/patients` | ADMIN, REGISTRAR | Patient fields (firstName, lastName required; phone required) | `Patient` |
| PATCH | `/patients/:id` | ADMIN, REGISTRAR | partial | `Patient` |

### 4.8 Kiosk — `/kiosk`, `/kiosk-requests`

| GET | `/kiosk/catalog` | KIOSK, ADMIN, REGISTRAR | – | `{ departments: (Department & { services: Service[] })[] }` — only active departments & active services that have ≥1 active doctor |
| POST | `/kiosk/requests` | KIOSK | `{ firstName, lastName, middleName?, phone, birthDate?, gender?, serviceIds: string[] (1..20, unique) }` | `KioskRequest` — emits WS `kiosk:new` to registrars |
| GET | `/kiosk-requests` | ADMIN, REGISTRAR | list + `status?` (default: NEW,IN_REVIEW), `dateFrom?`, `dateTo?` | `KioskRequest[]` |
| GET | `/kiosk-requests/:id` | ADMIN, REGISTRAR | includes `matchedPatients` | `KioskRequest` |
| POST | `/kiosk-requests/:id/claim` | ADMIN, REGISTRAR | – sets IN_REVIEW (409 if claimed by another registrar within last 10 min) | `KioskRequest` |
| POST | `/kiosk-requests/:id/cancel` | ADMIN, REGISTRAR | `{ reason? }` | `KioskRequest` |

### 4.9 Registration checkout (the core business transaction) — `/registrations`

| POST | `/registrations` | ADMIN, REGISTRAR | `CheckoutDto` | `CheckoutResult` |

```ts
interface CheckoutDto {
  idempotencyKey: string          // uuid generated by client per checkout attempt → duplicate payment protection
  kioskRequestId?: string         // marks request PROCESSED
  patientId?: string              // existing patient, OR
  patient?: CreatePatientDto      // new patient (one of patientId/patient required)
  items: { serviceId: string; doctorId: string }[]   // 1..20
  method: PaymentMethod
  paidAmount: number              // 0..total ; CONTRACT may be 0 (status UNPAID) or full
  contractNumber?: string         // required when method = CONTRACT
  contractOrganization?: string
  note?: string
}
interface CheckoutResult {
  patient: Patient
  payment: Payment               // with items, contract
  tickets: QueueTicket[]         // one ticket per (doctor) — items grouped by doctor
  receipt: Receipt
}
interface Receipt {
  hospitalName: string; hospitalPhone: string; hospitalAddress: string; header: string; footer: string
  receiptNumber: string; date: string
  patientName: string; patientCode: string
  items: { name: string; price: number; quantity: number; amount: number }[]
  totalAmount: number; paidAmount: number; remainingAmount: number
  method: PaymentMethod; contractNumber: string | null; status: PaymentStatus
  cashier: string
  tickets: { ticketNumber: string; roomNumber: string | null; doctorName: string; departmentName: string; services: string[] }[]
}
```

All in ONE DB transaction: patient (if new) → payment + items + contract + first transaction → queue tickets (row-locked counter) → kiosk request PROCESSED → audit logs. Validation: services active, doctors active+available (user ACTIVE) and assigned to that service. Same `idempotencyKey` again → returns the original result (HTTP 200), never creates a second payment.
After commit: WS `queue:updated` and `kiosk:processed`.

### 4.10 Payments — `/payments`

| GET | `/payments` | ADMIN, REGISTRAR | list + `status?`, `method?`, `dateFrom?`, `dateTo?`, `doctorId?`, `serviceId?`, `departmentId?`, `patientId?` ; sortBy `createdAt,totalAmount,paidAmount` | `Payment[]` (with patient) |
| GET | `/payments/:id` | ADMIN, REGISTRAR | | `Payment` (items, transactions, contract, queueTickets) |
| POST | `/payments/:id/pay` | ADMIN, REGISTRAR | `{ amount, method, note? }` (partial payment top-up, ≤ remaining) | `Payment` |
| POST | `/payments/:id/refund` | ADMIN | `{ amount?, reason }` (default full paid amount) → status REFUNDED if all refunded; cancels WAITING tickets on full refund | `Payment` |
| POST | `/payments/:id/cancel` | ADMIN, REGISTRAR | `{ reason }` — only when paidAmount = 0 (else must refund); cancels its WAITING/CALLED tickets | `Payment` |
| GET | `/payments/:id/receipt` | ADMIN, REGISTRAR | | `Receipt` |
| GET | `/payments/:id/receipt/pdf` | ADMIN, REGISTRAR | | `application/pdf` (80mm thermal layout) |

### 4.11 Queues — `/queues`

| GET | `/queues` | ADMIN, REGISTRAR | list + `status?` (comma separated), `date?` (default today), `doctorId?`, `departmentId?` ; sortBy `createdAt,sequence` | `QueueTicket[]` |
| GET | `/queues/my` | DOCTOR | `date?` — today's tickets for this doctor, ordered: CALLED/IN_PROGRESS first, then WAITING by sequence, then others | `QueueTicket[]` (with patient) |
| GET | `/queues/board` | **public** | `departmentId?` | `QueueBoard` (no personal data) |
| GET | `/queues/:id` | ADMIN, REGISTRAR, DOCTOR(own) | | `QueueTicket` |
| POST | `/queues/:id/call` | DOCTOR(own), ADMIN | – WAITING/SKIPPED/CALLED(re-call) → CALLED; sets calledAt, calledCount++, roomNumber from doctor | `QueueTicket` ; WS `queue:called` |
| POST | `/queues/:id/start` | DOCTOR(own), ADMIN | CALLED → IN_PROGRESS; creates `Visit` | `QueueTicket` |
| POST | `/queues/:id/complete` | DOCTOR(own), ADMIN | IN_PROGRESS → COMPLETED; body `{ complaint?, diagnosis?, notes? }` closes Visit | `QueueTicket` |
| POST | `/queues/:id/skip` | DOCTOR(own), ADMIN | WAITING/CALLED → SKIPPED (patient did not come) | `QueueTicket` |
| POST | `/queues/:id/requeue` | DOCTOR(own), ADMIN, REGISTRAR | SKIPPED → WAITING | `QueueTicket` |
| POST | `/queues/:id/cancel` | ADMIN, REGISTRAR | `{ reason? }` any non-final → CANCELLED | `QueueTicket` |
| POST | `/queues/:id/transfer` | ADMIN, REGISTRAR | `{ doctorId }` WAITING/SKIPPED only, doctor must provide the ticket's services | `QueueTicket` |

Invalid status transition → 409 `CONFLICT`. A doctor may have at most one ticket in `IN_PROGRESS` at a time (409).

```ts
interface QueueBoard {
  current: { ticketNumber: string; roomNumber: string | null; departmentName: string; doctorName: string; calledAt: string; status: 'CALLED'|'IN_PROGRESS' }[]  // latest first, max 12
  waiting: { ticketNumber: string; departmentName: string; roomNumber: string | null }[]   // next 20 by createdAt
  settings: { hospitalName: string; voiceAnnouncements: boolean; announcementLanguage: 'uz'|'ru' }
  serverTime: string
}
```

### 4.12 Reports — `/reports` (ADMIN)

| GET | `/reports/dashboard` | ADMIN | – | `DashboardStats` |
| GET | `/reports/revenue` | ADMIN | `period`, `dateFrom?`, `dateTo?` | `RevenuePoint[]` |
| GET | `/reports/payments` | ADMIN | same filters as `/payments` | `{ items: Payment[], summary: RevenueSummary }` paginated (`meta`) |
| GET | `/reports/services` | ADMIN | `dateFrom?`, `dateTo?`, `departmentId?` | `ServiceStat[]` |
| GET | `/reports/doctors` | ADMIN | `dateFrom?`, `dateTo?` | `DoctorStat[]` |
| GET | `/reports/departments` | ADMIN | `dateFrom?`, `dateTo?` | `DepartmentStat[]` |
| GET | `/reports/queues` | ADMIN | `dateFrom?`, `dateTo?`, `doctorId?`, `departmentId?`, `status?` | `{ items: QueueTicket[], summary: Record<QueueStatus, number> & { avgWaitMinutes: number | null; avgServiceMinutes: number | null } }` paginated |
| GET | `/reports/export/:type` | ADMIN | `format=xlsx|pdf` + the filters of that report (`type`: ReportType) | file |

```ts
interface RevenueSummary { cash: number; card: number; contract: number; total: number; refunded: number; count: number; debt: number }
interface DashboardStats {
  today: {
    patients: number          // distinct patients with payment today
    newPatients: number
    services: number          // payment items count today (non-cancelled)
    payments: number          // payments count today
    revenue: RevenueSummary   // by transactions (PAYMENT - REFUND) today
    waiting: number           // tickets WAITING today
    inProgress: number
    completed: number
    activeDoctors: number     // doctors isAvailable & user ACTIVE
    pendingKioskRequests: number
  }
  revenueLast30Days: RevenuePoint[]
  paymentMethods: { method: PaymentMethod; amount: number; count: number }[]   // current month
  topServices: ServiceStat[]      // current month, top 10
  doctors: DoctorStat[]           // current month
  departments: DepartmentStat[]   // current month
}
interface RevenuePoint { period: string /* '2026-10-01' | '2026-W40' | '2026-10' | '2026' */; cash: number; card: number; contract: number; total: number; count: number }
interface ServiceStat { serviceId: string; name: string; code: string; departmentName: string; count: number; amount: number }
interface DoctorStat { doctorId: string; name: string; specialty: string; roomNumber: string; servicesCount: number; patientsServed: number; amount: number }
interface DepartmentStat { departmentId: string; name: string; servicesCount: number; amount: number; patients: number }
```

Revenue is computed from `payment_transactions` (cash-flow basis: PAYMENT adds, REFUND subtracts) grouped by the transaction's method. Export headers show the filter period and totals, e.g. "01.09.2026 - 30.09.2026 · Jami bemorlar · Jami xizmatlar · Jami tushum".

### 4.13 Audit & login history (ADMIN)

| GET | `/audit` | ADMIN | list + `action?`, `module?`, `userId?`, `entityId?`, `dateFrom?`, `dateTo?` | `AuditLog[]` |
| GET | `/login-history` | ADMIN | list + `userId?`, `success?`, `dateFrom?`, `dateTo?` | `LoginHistory[]` |

### 4.14 Settings — `/settings`

| GET | `/settings` | any authenticated | | `SystemSettings` |
| GET | `/settings/public` | public | | `Pick<SystemSettings,'hospitalName'|'logo'|'phone'|'address'|'currency'|'timezone'|'voiceAnnouncements'|'announcementLanguage'>` |
| PATCH | `/settings` | ADMIN | partial `SystemSettings` | `SystemSettings` |

Queue prefixes are managed per department (`Department.queuePrefix`).

### 4.15 Health

| GET | `/health` | public | | `{ status: 'ok', db: 'up', redis: 'up'|'down', time }` |

## 5. Real-time (Socket.IO)

Connect: `io(API_ORIGIN + '/realtime', { path: '/socket.io', auth: { token?: accessToken } })`.
Without a token the socket joins only the `board` room. With a valid token it auto-joins rooms: `role:<ROLE>`, `user:<userId>`, and `doctor:<doctorId>` for doctors.

Server → client events:

| event | rooms | payload |
|---|---|---|
| `queue:updated` | `board`, `role:ADMIN`, `role:REGISTRAR`, `doctor:<id>` | `{ ticketId, ticketNumber, status, doctorId, departmentId }` — clients refetch |
| `queue:called` | `board`, `role:ADMIN`, `role:REGISTRAR`, `doctor:<id>` | `{ ticketId, ticketNumber, roomNumber, doctorName, departmentName, calledAt, calledCount }` — board shows + speaks |
| `kiosk:new` | `role:REGISTRAR`, `role:ADMIN` | `{ id, number, fullName, totalAmount, servicesCount }` |
| `kiosk:updated` | `role:REGISTRAR`, `role:ADMIN` | `{ id, status }` |
| `payment:updated` | `role:ADMIN`, `role:REGISTRAR` | `{ id, status }` |

Multi-instance: Socket.IO Redis adapter (`REDIS_HOST`) so events reach clients on every backend replica.
