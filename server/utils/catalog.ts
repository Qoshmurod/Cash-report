export const DEPARTMENTS = [
  { value: 'PARAZITOLOGIYA', label: 'Parazitologiya' },
  { value: 'VIRUSOLOGIYA', label: 'Virusologiya' },
  { value: 'BAKTERIOLOGIYA', label: 'Bakteriologiya' },
  { value: 'SAN_MINIMUM', label: 'San. Minimum' }
] as const

export const DEPARTMENT_CODES: string[] = DEPARTMENTS.map((item) => item.value)

// Permissions are grouped by section so the role editor can show which sections a role can open.
export const PERMISSION_GROUPS = [
  { section: 'Kassa', items: [
    ['PAYMENTS_VIEW', 'To‘lovlarni ko‘rish'],
    ['PAYMENTS_CREATE', 'To‘lov kiritish'],
    ['PAYMENTS_EDIT', 'To‘lovni tahrirlash (ortiqcha/noto‘g‘ri to‘lov)'],
    ['PAYMENTS_DELETE', 'To‘lovni o‘chirish']
  ] },
  { section: 'Hisobotlar', items: [
    ['REPORTS_DAILY', 'Kunlik statistika'],
    ['REPORTS_MONTHLY', 'Oylik hisobot'],
    ['REPORTS_YEARLY', 'Yillik hisobot'],
    ['REPORTS_EXPORT', 'Excel eksport']
  ] },
  { section: 'Kunni yopish', items: [
    ['DAY_CLOSE', 'Kunni yopish va kunlik to‘lovlarni tanlab yuklash']
  ] },
  { section: 'Bemorlar', items: [
    ['PATIENTS_VIEW', 'Bemorlar bazasini ko‘rish'],
    ['PATIENTS_CREATE', 'Bemor qo‘shish'],
    ['PATIENTS_NAME_EDIT', 'Bemor ma’lumotlarini tahrirlash'],
    ['PATIENTS_DELETE', 'Bemorni o‘chirish'],
    ['PATIENTS_IMPORT', 'Bemorlarni Excel/CSV dan import qilish']
  ] },
  { section: 'Qabul (registratura)', items: [
    ['APPOINTMENTS_VIEW', 'Qabul va navbatni ko‘rish'],
    ['APPOINTMENTS_MANAGE', 'Qabul va navbatni boshqarish']
  ] },
  { section: 'Laboratoriya bo‘limlari', items: [
    ['DEPARTMENTS_VIEW', 'Bo‘lim ish joyini ochish (rolda belgilangan bo‘limlar)']
  ] },
  { section: 'Xizmatlar va shifokorlar', items: [
    ['SERVICES_VIEW', 'Xizmatlarni ko‘rish'],
    ['SERVICES_MANAGE', 'Xizmatlarni tahrirlash, deaktivatsiya, o‘chirish'],
    ['DOCTORS_VIEW', 'Shifokorlarni ko‘rish'],
    ['DOCTORS_MANAGE', 'Shifokorlarni tahrirlash, deaktivatsiya, o‘chirish']
  ] },
  { section: 'Xodimlar', items: [
    ['STAFF_VIEW', 'Xodimlar va kirish tarixini ko‘rish'],
    ['STAFF_MANAGE', 'Xodim ma’lumotlarini tahrirlash, deaktivatsiya, o‘chirish']
  ] },
  { section: 'Shartnomalar', items: [
    ['CONTRACTS_VIEW', 'Shartnomalar va mijozlar ro‘yxatini ko‘rish'],
    ['CONTRACTS_MANAGE', 'Shartnoma va mijozlar ro‘yxatini yuklash/tahrirlash']
  ] },
  { section: 'Kafolat xatlari', items: [
    ['GUARANTEE_LETTERS_VIEW', 'Kafolat xatlarini ko‘rish va yuklab olish'],
    ['GUARANTEE_LETTERS_UPLOAD', 'Kafolat xati (namuna) ni tizimga yuklash']
  ] },
  { section: 'Audit', items: [
    ['AUDIT_VIEW', 'Audit jurnalini ko‘rish']
  ] }
] as const

export const PERMISSIONS: Array<{ code: string; label: string; section: string }> = PERMISSION_GROUPS.flatMap((group) =>
  group.items.map(([code, label]) => ({ code, label, section: group.section }))
)

export const PERMISSION_CODES = new Set(PERMISSIONS.map((item) => item.code))

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Naqd' },
  { value: 'CARD', label: 'Plastik' },
  { value: 'TRANSFER', label: 'O‘tkazma' },
  { value: 'CONTRACT', label: 'Shartnoma asosida' }
] as const
