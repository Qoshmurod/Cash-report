import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'PATIENTS_DELETE')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Noto‘g‘ri bemor ID' })
  const patient = await prisma.patient.findUnique({ where: { id }, select: { id: true, fullName: true } })
  if (!patient) throw createError({ statusCode: 404, statusMessage: 'Bemor topilmadi' })
  await prisma.patient.delete({ where: { id } })
  await audit(event, user, 'DELETE', 'patient', id, `Bemor o‘chirildi: ${patient.fullName}`)
  return { ok: true }
})
