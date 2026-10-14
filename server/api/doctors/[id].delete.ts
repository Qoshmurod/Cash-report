import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { routeId } from '../../utils/catalog-items'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'DOCTORS_MANAGE')
  const id = routeId(event)
  const doctor = await prisma.doctor.findUnique({ where: { id } })
  if (!doctor) throw createError({ statusCode: 404, statusMessage: 'Shifokor topilmadi' })
  await prisma.doctor.delete({ where: { id } })
  await audit(event, user, 'DELETE', 'doctor', id, `Shifokor o‘chirildi: ${doctor.fullName}`)
  return { ok: true }
})
