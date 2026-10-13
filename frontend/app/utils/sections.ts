/** Bo'limlar — must match backend `Section` enum. A super admin assigns them per user. */
export type SectionKey =
  | 'dashboard'
  | 'registration'
  | 'clients'
  | 'payments'
  | 'payment_refund'
  | 'day_close'
  | 'contracts'
  | 'contract_credit'
  | 'contract_credit_approve'
  | 'permissions'
  | 'queues'
  | 'staff'
  | 'doctors'
  | 'departments'
  | 'services'
  | 'reports'
  | 'audit'
  | 'login_history'
  | 'settings'
  | 'doctor_cabinet'
  | 'kiosk'

export interface MenuEntry {
  key: string
  section: SectionKey
  labelKey: string
  icon: string
  to: string
  exact?: boolean
  group: number
}

/** Sidebar, in display order; each entry shows only if the user has its section. */
export const MENU: MenuEntry[] = [
  { key: 'dashboard', section: 'dashboard', labelKey: 'nav.dashboard', icon: 'i-lucide-layout-dashboard', to: '/admin', exact: true, group: 0 },
  { key: 'requests', section: 'registration', labelKey: 'nav.requests', icon: 'i-lucide-inbox', to: '/registrar', exact: true, group: 1 },
  { key: 'checkout', section: 'registration', labelKey: 'nav.newRegistration', icon: 'i-lucide-clipboard-plus', to: '/registrar/checkout', group: 1 },
  { key: 'clients', section: 'clients', labelKey: 'nav.patients', icon: 'i-lucide-users', to: '/admin/patients', group: 2 },
  { key: 'payments', section: 'payments', labelKey: 'nav.payments', icon: 'i-lucide-wallet', to: '/admin/payments', group: 2 },
  { key: 'dayClose', section: 'day_close', labelKey: 'nav.dayClose', icon: 'i-lucide-lock-keyhole', to: '/admin/day-close', group: 2 },
  { key: 'contracts', section: 'contracts', labelKey: 'nav.contracts', icon: 'i-lucide-file-signature', to: '/admin/contracts', group: 2 },
  { key: 'queues', section: 'queues', labelKey: 'nav.queues', icon: 'i-lucide-list-ordered', to: '/admin/queues', group: 2 },
  { key: 'cabinet', section: 'doctor_cabinet', labelKey: 'nav.cabinet', icon: 'i-lucide-stethoscope', to: '/doctor', group: 2 },
  { key: 'staff', section: 'staff', labelKey: 'nav.staff', icon: 'i-lucide-id-card', to: '/admin/staff', group: 3 },
  { key: 'permissions', section: 'permissions', labelKey: 'nav.permissions', icon: 'i-lucide-shield-check', to: '/admin/staff', group: 3 },
  { key: 'doctors', section: 'doctors', labelKey: 'nav.doctors', icon: 'i-lucide-stethoscope', to: '/admin/doctors', group: 3 },
  { key: 'departments', section: 'departments', labelKey: 'nav.departments', icon: 'i-lucide-building-2', to: '/admin/departments', group: 3 },
  { key: 'services', section: 'services', labelKey: 'nav.services', icon: 'i-lucide-clipboard-list', to: '/admin/services', group: 3 },
  { key: 'reports', section: 'reports', labelKey: 'nav.reports', icon: 'i-lucide-chart-column', to: '/admin/reports', group: 4 },
  { key: 'audit', section: 'audit', labelKey: 'nav.audit', icon: 'i-lucide-history', to: '/admin/audit', group: 5 },
  { key: 'loginHistory', section: 'login_history', labelKey: 'nav.loginHistory', icon: 'i-lucide-log-in', to: '/admin/login-history', group: 5 },
  { key: 'settings', section: 'settings', labelKey: 'nav.settings', icon: 'i-lucide-settings', to: '/admin/settings', group: 6 },
  { key: 'kiosk', section: 'kiosk', labelKey: 'kiosk.title', icon: 'i-lucide-tablet-smartphone', to: '/kiosk', group: 6 },
]

/** Sections shown in the super admin's permission editor (label = i18n `sections.<key>`). */
export const SECTION_KEYS: SectionKey[] = [
  'dashboard',
  'registration',
  'clients',
  'payments',
  'payment_refund',
  'day_close',
  'contracts',
  'contract_credit',
  'contract_credit_approve',
  'permissions',
  'queues',
  'doctor_cabinet',
  'staff',
  'doctors',
  'departments',
  'services',
  'reports',
  'audit',
  'login_history',
  'settings',
  'kiosk',
]

/** Bo'limlar a delegate can never hand out. */
export const NON_DELEGABLE: SectionKey[] = ['permissions']
