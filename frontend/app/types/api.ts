/**
 * API types — mirror of docs/api.md (source of truth for backend ↔ frontend contract).
 */

export interface PageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiSuccess<T> {
  success: true
  data: T
  meta?: PageMeta
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BAD_REQUEST'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR'
  | 'PASSWORD_CHANGE_REQUIRED'
  | 'NETWORK_ERROR'

export interface ApiErrorBody {
  success: false
  error: {
    statusCode: number
    code: ApiErrorCode | string
    message: string
    details?: unknown
    path: string
    timestamp: string
  }
}

export type SortOrder = 'ASC' | 'DESC'

export interface ListParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: SortOrder
}

// ───────────── Enums ─────────────
export type Role = 'ADMIN' | 'DOCTOR' | 'REGISTRAR' | 'KIOSK'
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
export type Gender = 'MALE' | 'FEMALE'
export type PaymentMethod = 'CASH' | 'CARD' | 'CONTRACT'
export type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'REFUNDED' | 'CANCELLED'
export type PaymentTransactionType = 'PAYMENT' | 'REFUND'
export type QueueStatus = 'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED'
export type KioskRequestStatus = 'NEW' | 'IN_REVIEW' | 'PROCESSED' | 'CANCELLED'
export type VisitStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'PASSWORD_CHANGE'
  | 'PAYMENT'
  | 'REFUND'
  | 'CANCEL'
  | 'QUEUE_CALL'
  | 'QUEUE_STATUS'
  | 'PRICE_CHANGE'
  | 'EXPORT'
export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type ExportFormat = 'xlsx' | 'pdf'
export type ReportType = 'payments' | 'patients' | 'services' | 'doctors' | 'queues' | 'audit' | 'login-history'

export const ROLES: Role[] = ['ADMIN', 'DOCTOR', 'REGISTRAR', 'KIOSK']
export const USER_STATUSES: UserStatus[] = ['ACTIVE', 'INACTIVE', 'BLOCKED']
export const GENDERS: Gender[] = ['MALE', 'FEMALE']
export const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'CONTRACT']
export const PAYMENT_STATUSES: PaymentStatus[] = ['PAID', 'PARTIALLY_PAID', 'UNPAID', 'REFUNDED', 'CANCELLED']
export const QUEUE_STATUSES: QueueStatus[] = ['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED']
export const KIOSK_REQUEST_STATUSES: KioskRequestStatus[] = ['NEW', 'IN_REVIEW', 'PROCESSED', 'CANCELLED']
export const AUDIT_ACTIONS: AuditAction[] = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'LOGIN_FAILED',
  'PASSWORD_CHANGE',
  'PAYMENT',
  'REFUND',
  'CANCEL',
  'QUEUE_CALL',
  'QUEUE_STATUS',
  'PRICE_CHANGE',
  'EXPORT',
]
export const WEEKDAYS = ['1', '2', '3', '4', '5', '6', '7'] as const
export type Weekday = (typeof WEEKDAYS)[number]

// ───────────── Models ─────────────
export type UserRef = Pick<User, 'id' | 'firstName' | 'lastName'>
export type UserShort = Pick<User, 'id' | 'login' | 'firstName' | 'lastName' | 'role'>

export interface User {
  id: string
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
  avatar: string | null
  mustChangePassword: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  doctor?: Doctor | null
}

export interface WorkDay {
  start: string
  end: string
}
export type WorkSchedule = Partial<Record<Weekday, WorkDay | null>>

export interface Doctor {
  id: string
  userId: string
  specialty: string
  roomNumber: string
  workSchedule: WorkSchedule
  isAvailable: boolean
  user?: Pick<User, 'id' | 'firstName' | 'lastName' | 'middleName' | 'phone' | 'status' | 'avatar'>
  services?: Service[]
  createdAt: string
  updatedAt: string
}

export interface Department {
  id: string
  name: string
  nameRu: string | null
  code: string
  queuePrefix: string
  description: string | null
  isActive: boolean
  sortOrder: number
  servicesCount?: number
  createdAt: string
  updatedAt: string
}

export interface Service {
  id: string
  departmentId: string
  department?: Department
  name: string
  nameRu: string | null
  code: string
  price: number
  durationMinutes: number
  description: string | null
  isActive: boolean
  doctors?: Doctor[]
  createdAt: string
  updatedAt: string
}

export interface ServicePriceHistory {
  id: string
  serviceId: string
  oldPrice: number
  newPrice: number
  changedBy: UserRef | null
  changedAt: string
}

export interface Patient {
  id: string
  patientCode: string
  firstName: string
  lastName: string
  middleName: string | null
  birthDate: string | null
  gender: Gender | null
  phone: string | null
  email: string | null
  address: string | null
  passport: string | null
  profession: string | null
  avatar: string | null
  createdBy?: UserRef | null
  createdAt: string
  updatedAt: string
}

export interface CreatePatientDto {
  firstName: string
  lastName: string
  middleName?: string | null
  birthDate?: string | null
  gender?: Gender | null
  phone: string
  email?: string | null
  address?: string | null
  passport?: string | null
  profession?: string | null
  avatar?: string | null
}

export interface KioskRequestItem {
  id: string
  serviceId: string
  service?: Service
  serviceName: string
  price: number
}

export interface KioskRequest {
  id: string
  number: number
  status: KioskRequestStatus
  firstName: string
  lastName: string
  middleName: string | null
  phone: string
  birthDate: string | null
  gender: Gender | null
  items: KioskRequestItem[]
  totalAmount: number
  kioskUser?: Pick<User, 'id' | 'login'> | null
  processedBy?: UserRef | null
  /** Registrar currently reviewing the request (IN_REVIEW); returned by the backend beyond the base contract. */
  claimedBy?: UserRef | null
  claimedAt?: string | null
  processedAt: string | null
  paymentId: string | null
  matchedPatients?: Patient[]
  createdAt: string
}

export interface PaymentItem {
  id: string
  serviceId: string
  serviceName: string
  serviceCode: string
  departmentId: string
  doctorId: string | null
  price: number
  quantity: number
  amount: number
  service?: Service
  doctor?: Doctor
}

export interface PaymentTransaction {
  id: string
  type: PaymentTransactionType
  method: PaymentMethod
  amount: number
  note: string | null
  createdBy?: UserRef
  createdAt: string
}

export interface Contract {
  id: string
  contractNumber: string
  organization: string | null
  note: string | null
  createdAt: string
}

export interface Payment {
  id: string
  receiptNumber: string
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
  createdBy?: UserRef | null
  createdAt: string
  updatedAt: string
}

export type QueuePatient = Pick<
  Patient,
  'id' | 'patientCode' | 'firstName' | 'lastName' | 'middleName' | 'phone' | 'birthDate' | 'gender'
>

export interface QueueTicket {
  id: string
  ticketNumber: string
  prefix: string
  sequence: number
  queueDate: string
  status: QueueStatus
  patientId: string
  patient?: QueuePatient
  doctorId: string | null
  doctor?: Doctor
  departmentId: string
  department?: Department
  paymentId: string | null
  roomNumber: string | null
  services: { id: string; name: string }[]
  calledAt: string | null
  calledCount: number
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export interface Visit {
  id: string
  queueTicketId: string
  patientId: string
  doctorId: string
  status: VisitStatus
  startedAt: string
  endedAt: string | null
  complaint: string | null
  diagnosis: string | null
  notes: string | null
}

export interface AuditLog {
  id: string
  user?: UserShort | null
  action: AuditAction
  module: string
  entity: string
  entityId: string | null
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  description: string | null
  ip: string | null
  userAgent: string | null
  createdAt: string
}

export interface LoginHistory {
  id: string
  user?: UserShort | null
  loginAttempt: string
  success: boolean
  failureReason: string | null
  ip: string | null
  userAgent: string | null
  browser: string | null
  os: string | null
  device: string | null
  loginAt: string
  logoutAt: string | null
}

export interface SystemSettings {
  hospitalName: string
  phone: string
  address: string
  logo: string | null
  receiptHeader: string
  receiptFooter: string
  currency: string
  timezone: string
  workingHours: { start: string; end: string }
  voiceAnnouncements: boolean
  announcementLanguage: 'uz' | 'ru'
}

export type PublicSettings = Pick<
  SystemSettings,
  'hospitalName' | 'logo' | 'phone' | 'address' | 'currency' | 'timezone' | 'voiceAnnouncements' | 'announcementLanguage'
>

// ───────────── Auth ─────────────
export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: User
}

// ───────────── Kiosk ─────────────
export interface KioskCatalogDepartment extends Department {
  services: Service[]
}
export interface KioskCatalog {
  departments: KioskCatalogDepartment[]
}
export interface CreateKioskRequestDto {
  firstName: string
  lastName: string
  middleName?: string
  phone: string
  birthDate?: string
  gender?: Gender
  serviceIds: string[]
}

// ───────────── Checkout ─────────────
export interface CheckoutDto {
  idempotencyKey: string
  kioskRequestId?: string
  patientId?: string
  patient?: CreatePatientDto
  items: { serviceId: string; doctorId: string }[]
  method: PaymentMethod
  paidAmount: number
  contractNumber?: string
  contractOrganization?: string
  note?: string
}

export interface ReceiptTicket {
  ticketNumber: string
  roomNumber: string | null
  doctorName: string
  departmentName: string
  services: string[]
}

export interface Receipt {
  hospitalName: string
  hospitalPhone: string
  hospitalAddress: string
  header: string
  footer: string
  receiptNumber: string
  date: string
  patientName: string
  patientCode: string
  items: { name: string; price: number; quantity: number; amount: number }[]
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  method: PaymentMethod
  contractNumber: string | null
  status: PaymentStatus
  cashier: string
  tickets: ReceiptTicket[]
}

export interface CheckoutResult {
  patient: Patient
  payment: Payment
  tickets: QueueTicket[]
  receipt: Receipt
}

// ───────────── Queue board ─────────────
export interface QueueBoardCurrent {
  ticketNumber: string
  roomNumber: string | null
  departmentName: string
  doctorName: string
  calledAt: string
  status: 'CALLED' | 'IN_PROGRESS'
}
export interface QueueBoard {
  current: QueueBoardCurrent[]
  waiting: { ticketNumber: string; departmentName: string; roomNumber: string | null }[]
  settings: { hospitalName: string; voiceAnnouncements: boolean; announcementLanguage: 'uz' | 'ru' }
  serverTime: string
}

// ───────────── Reports ─────────────
export interface RevenueSummary {
  cash: number
  card: number
  contract: number
  total: number
  refunded: number
  count: number
  debt: number
}
export interface RevenuePoint {
  period: string
  cash: number
  card: number
  contract: number
  total: number
  count: number
}
export interface ServiceStat {
  serviceId: string
  name: string
  code: string
  departmentName: string
  count: number
  amount: number
}
export interface DoctorStat {
  doctorId: string
  name: string
  specialty: string
  roomNumber: string
  servicesCount: number
  patientsServed: number
  amount: number
}
export interface DepartmentStat {
  departmentId: string
  name: string
  servicesCount: number
  amount: number
  patients: number
}
export interface DashboardStats {
  today: {
    patients: number
    newPatients: number
    services: number
    payments: number
    revenue: RevenueSummary
    waiting: number
    inProgress: number
    completed: number
    activeDoctors: number
    pendingKioskRequests: number
  }
  revenueLast30Days: RevenuePoint[]
  paymentMethods: { method: PaymentMethod; amount: number; count: number }[]
  topServices: ServiceStat[]
  doctors: DoctorStat[]
  departments: DepartmentStat[]
}
export type QueueReportSummary = Record<QueueStatus, number> & {
  avgWaitMinutes: number | null
  avgServiceMinutes: number | null
}

export interface PatientHistory {
  payments: Payment[]
  tickets: QueueTicket[]
  visits: Visit[]
}

// ───────────── Realtime events ─────────────
export interface QueueUpdatedEvent {
  ticketId: string
  ticketNumber: string
  status: QueueStatus
  doctorId: string | null
  departmentId: string
}
export interface QueueCalledEvent {
  ticketId: string
  ticketNumber: string
  roomNumber: string | null
  doctorName: string
  departmentName: string
  calledAt: string
  calledCount: number
}
export interface KioskNewEvent {
  id: string
  number: number
  fullName: string
  totalAmount: number
  servicesCount: number
}
export interface KioskUpdatedEvent {
  id: string
  status: KioskRequestStatus
}
export interface PaymentUpdatedEvent {
  id: string
  status: PaymentStatus
}
export interface ServerToClientEvents {
  'queue:updated': (e: QueueUpdatedEvent) => void
  'queue:called': (e: QueueCalledEvent) => void
  'kiosk:new': (e: KioskNewEvent) => void
  'kiosk:updated': (e: KioskUpdatedEvent) => void
  'payment:updated': (e: PaymentUpdatedEvent) => void
}
