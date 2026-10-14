import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { parseDoctorBody, routeId } from '../../utils/catalog-items'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'DOCTORS_MANAGE')
  const id = routeId(event)
  const before = await prisma.doctor.findUnique({ where: { id } })
  if (!before) throw createError({ statusCode: 404, statusMessage: 'Shifokor topilmadi' })
  const doctor = await prisma.doctor.update({ where: { id }, data: parseDoctorBody(await readBody(event)) })
  await audit(event, user, 'UPDATE', 'doctor', id, `Shifokor tahrirlandi: ${doctor.fullName}`, { before, after: doctor })
  return { doctor }
})
