import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

const catalog = [
  ['APPOINTMENTS_VIEW', 'Qabul va navbatni ko‘rish'],
  ['APPOINTMENTS_MANAGE', 'Qabul va navbatni boshqarish'],
  ['DOCTORS_VIEW', 'Shifokorlarni ko‘rish'],
  ['DOCTORS_MANAGE', 'Shifokorlarni boshqarish'],
  ['SERVICES_VIEW', 'Xizmatlarni ko‘rish'],
  ['SERVICES_MANAGE', 'Xizmatlarni boshqarish'],
  ['REPORTS_DAILY', 'Kunlik hisobot'],
  ['REPORTS_MONTHLY', 'Oylik hisobot'],
  ['REPORTS_YEARLY', 'Yillik hisobot'],
  ['REPORTS_EXPORT', 'Excel eksport']
  ,['REPORTS_EDIT', 'Hisobotlarni tahrirlash']
  ,['USERS_CREATE', 'Login foydalanuvchilarini yaratish']
  ,['DATA_EDIT', 'Ma’lumotlarni tahrirlash']
  ,['DATABASE_DATA_ADD', 'Bazaga yangi ma’lumot qo‘shish']
  ,['LOGIN_HISTORY_VIEW', 'Kirish/chiqish tarixini ko‘rish']
  ,['PAYMENTS_VIEW', 'To‘lovlarni ko‘rish']
  ,['PAYMENTS_CREATE', 'To‘lov kiritish']
  ,['PATIENTS_NAME_EDIT', 'Bemor ism-familiyasini tahrirlash']
] as const

export default defineEventHandler(async (event) => {
  await requireAuth(event, ['SUPER_ADMIN'])
  await prisma.permission.createMany({ data: catalog.map(([code, label]) => ({ code, label })), skipDuplicates: true })
  return {
    permissions: await prisma.permission.findMany({ orderBy: { code: 'asc' }, include: { users: { select: { userId: true } } } }),
    users: await prisma.user.findMany({ select: { id: true, username: true, role: true }, orderBy: { username: 'asc' } })
  }
})
