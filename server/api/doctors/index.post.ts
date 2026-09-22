import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'DOCTORS_MANAGE')
  const body = await readBody(event)
  if (!String(body?.fullName || '').trim()) throw createError({ statusCode: 400, statusMessage: 'Shifokor ismi shart' })
  return { doctor: await prisma.doctor.create({ data: { fullName: String(body.fullName).trim(), specialty: body.specialty ? String(body.specialty) : null, phone: body.phone ? String(body.phone) : null } }) }
})
