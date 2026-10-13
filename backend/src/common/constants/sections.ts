import { Role } from './enums';

/**
 * Bo'limlar — units of access. A super admin assigns them per user (users.allowed_sections);
 * when nothing is assigned the role defaults below apply.
 */
export enum Section {
  DASHBOARD = 'dashboard',
  REGISTRATION = 'registration',
  CLIENTS = 'clients',
  PAYMENTS = 'payments',
  PAYMENT_REFUND = 'payment_refund',
  DAY_CLOSE = 'day_close',
  CONTRACTS = 'contracts',
  /** Kafolat xatini kiritish va qarzga o'tkazish */
  CONTRACT_CREDIT = 'contract_credit',
  /** Namunaga mos kelmagan kafolat xatini tasdiqlash, namunalarni boshqarish */
  CONTRACT_CREDIT_APPROVE = 'contract_credit_approve',
  QUEUES = 'queues',
  STAFF = 'staff',
  DOCTORS = 'doctors',
  DEPARTMENTS = 'departments',
  SERVICES = 'services',
  REPORTS = 'reports',
  AUDIT = 'audit',
  LOGIN_HISTORY = 'login_history',
  SETTINGS = 'settings',
  DOCTOR_CABINET = 'doctor_cabinet',
  KIOSK = 'kiosk',
  /** Ruxsatlarni belgilash: super admin tasdiqlagan bo'limlarni boshqalarga berish */
  PERMISSIONS = 'permissions',
}

export const ALL_SECTIONS: Section[] = Object.values(Section);

/** Sensitive bo'limlar no role gets by default — only granted explicitly (super admin / delegate). */
export const SUPER_ADMIN_GRANTED: Section[] = [Section.CONTRACT_CREDIT, Section.CONTRACT_CREDIT_APPROVE, Section.PERMISSIONS];

/** A delegate can never hand out the right to delegate. */
export const NON_DELEGABLE: Section[] = [Section.PERMISSIONS];

export const ROLE_DEFAULT_SECTIONS: Record<Role, Section[]> = {
  [Role.ADMIN]: ALL_SECTIONS.filter((s) => !(SUPER_ADMIN_GRANTED as string[]).includes(s) && s !== Section.DOCTOR_CABINET),
  [Role.REGISTRAR]: [Section.REGISTRATION, Section.CLIENTS, Section.PAYMENTS, Section.DAY_CLOSE, Section.QUEUES],
  [Role.DOCTOR]: [Section.DOCTOR_CABINET],
  [Role.KIOSK]: [Section.KIOSK],
  [Role.ACCOUNTANT]: [Section.CONTRACTS, Section.CLIENTS],
  [Role.MANAGER]: [Section.DASHBOARD, Section.REPORTS, Section.CONTRACTS, Section.PAYMENTS],
};

export const effectiveSections = (role: Role, allowed: string[] | null | undefined): Section[] =>
  allowed ? (allowed.filter((s) => (ALL_SECTIONS as string[]).includes(s)) as Section[]) : ROLE_DEFAULT_SECTIONS[role];
