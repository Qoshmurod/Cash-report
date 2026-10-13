/** Module names used in audit rows (kept stable for filtering in the UI). */
export const AUDIT_MODULES = {
  AUTH: 'auth',
  USERS: 'users',
  DOCTORS: 'doctors',
  DEPARTMENTS: 'departments',
  SERVICES: 'services',
  PATIENTS: 'patients',
  KIOSK: 'kiosk',
  PAYMENTS: 'payments',
  QUEUES: 'queues',
  SETTINGS: 'settings',
  REPORTS: 'reports',
  PROFILE: 'profile',
} as const;
