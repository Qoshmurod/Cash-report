export enum Role {
  ADMIN = 'ADMIN',
  DOCTOR = 'DOCTOR',
  REGISTRAR = 'REGISTRAR',
  KIOSK = 'KIOSK',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  CONTRACT = 'CONTRACT',
}

export enum PaymentStatus {
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  UNPAID = 'UNPAID',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentTransactionType {
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
}

export enum QueueStatus {
  WAITING = 'WAITING',
  CALLED = 'CALLED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  CANCELLED = 'CANCELLED',
}

export enum KioskRequestStatus {
  NEW = 'NEW',
  IN_REVIEW = 'IN_REVIEW',
  PROCESSED = 'PROCESSED',
  CANCELLED = 'CANCELLED',
}

export enum VisitStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  CANCEL = 'CANCEL',
  QUEUE_CALL = 'QUEUE_CALL',
  QUEUE_STATUS = 'QUEUE_STATUS',
  PRICE_CHANGE = 'PRICE_CHANGE',
  EXPORT = 'EXPORT',
}

export enum ReportPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum ExportFormat {
  XLSX = 'xlsx',
  PDF = 'pdf',
}

export enum ReportType {
  PAYMENTS = 'payments',
  PATIENTS = 'patients',
  SERVICES = 'services',
  DOCTORS = 'doctors',
  QUEUES = 'queues',
  AUDIT = 'audit',
  LOGIN_HISTORY = 'login-history',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}
