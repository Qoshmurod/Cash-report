import type {
  AuditAction,
  Gender,
  KioskRequestStatus,
  PaymentMethod,
  PaymentStatus,
  QueueStatus,
  Role,
  UserStatus,
} from '~/types/api'
import {
  AUDIT_ACTIONS,
  GENDERS,
  KIOSK_REQUEST_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  QUEUE_STATUSES,
  ROLES,
  USER_STATUSES,
} from '~/types/api'

export type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

export const QUEUE_STATUS_COLOR: Record<QueueStatus, BadgeColor> = {
  WAITING: 'info',
  CALLED: 'warning',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  SKIPPED: 'neutral',
  CANCELLED: 'error',
}
export const PAYMENT_STATUS_COLOR: Record<PaymentStatus, BadgeColor> = {
  PAID: 'success',
  PARTIALLY_PAID: 'warning',
  UNPAID: 'error',
  REFUNDED: 'secondary',
  CANCELLED: 'neutral',
}
export const USER_STATUS_COLOR: Record<UserStatus, BadgeColor> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  BLOCKED: 'error',
}
export const KIOSK_STATUS_COLOR: Record<KioskRequestStatus, BadgeColor> = {
  NEW: 'info',
  IN_REVIEW: 'warning',
  PROCESSED: 'success',
  CANCELLED: 'neutral',
}
export const ROLE_COLOR: Record<Role, BadgeColor> = {
  ADMIN: 'primary',
  DOCTOR: 'secondary',
  REGISTRAR: 'info',
  KIOSK: 'neutral',
}
export const PAYMENT_METHOD_ICON: Record<PaymentMethod, string> = {
  CASH: 'i-lucide-banknote',
  CARD: 'i-lucide-credit-card',
  CONTRACT: 'i-lucide-file-signature',
}
export const AUDIT_ACTION_COLOR: Record<AuditAction, BadgeColor> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'error',
  LOGIN: 'primary',
  LOGOUT: 'neutral',
  LOGIN_FAILED: 'error',
  PASSWORD_CHANGE: 'warning',
  PAYMENT: 'success',
  REFUND: 'warning',
  CANCEL: 'error',
  QUEUE_CALL: 'secondary',
  QUEUE_STATUS: 'info',
  PRICE_CHANGE: 'warning',
  EXPORT: 'neutral',
}

/** Translated labels + select options for every enum. */
export function useLabels() {
  const { t } = useI18n()

  const role = (v: Role) => t(`enums.role.${v}`)
  const userStatus = (v: UserStatus) => t(`enums.userStatus.${v}`)
  const gender = (v: Gender | null | undefined) => (v ? t(`enums.gender.${v}`) : '—')
  const paymentMethod = (v: PaymentMethod) => t(`enums.paymentMethod.${v}`)
  const paymentStatus = (v: PaymentStatus) => t(`enums.paymentStatus.${v}`)
  const queueStatus = (v: QueueStatus) => t(`enums.queueStatus.${v}`)
  const kioskStatus = (v: KioskRequestStatus) => t(`enums.kioskStatus.${v}`)
  const auditAction = (v: AuditAction) => t(`enums.auditAction.${v}`)

  const opts = <T extends string>(values: readonly T[], label: (v: T) => string) =>
    computed(() => values.map((value) => ({ value, label: label(value) })))

  return {
    role,
    userStatus,
    gender,
    paymentMethod,
    paymentStatus,
    queueStatus,
    kioskStatus,
    auditAction,
    roleOptions: opts(ROLES, role),
    staffRoleOptions: opts(ROLES, role),
    userStatusOptions: opts(USER_STATUSES, userStatus),
    genderOptions: opts(GENDERS, gender),
    paymentMethodOptions: opts(PAYMENT_METHODS, paymentMethod),
    paymentStatusOptions: opts(PAYMENT_STATUSES, paymentStatus),
    queueStatusOptions: opts(QUEUE_STATUSES, queueStatus),
    kioskStatusOptions: opts(KIOSK_REQUEST_STATUSES, kioskStatus),
    auditActionOptions: opts(AUDIT_ACTIONS, auditAction),
  }
}

export function personName(p: { firstName?: string | null; lastName?: string | null; middleName?: string | null } | null | undefined, withMiddle = false): string {
  if (!p) return '—'
  return [p.lastName, p.firstName, withMiddle ? p.middleName : null].filter(Boolean).join(' ') || '—'
}

export function doctorName(d: { user?: { firstName?: string | null; lastName?: string | null } | null } | null | undefined): string {
  if (!d?.user) return '—'
  return personName(d.user)
}
