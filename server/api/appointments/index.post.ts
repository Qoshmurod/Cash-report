import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'APPOINTMENTS_MANAGE')
  const body = await readBody(event)
  const patientId = Number(body?.patientId)
  if (!Number.isInteger(patientId)) throw createError({ statusCode: 400, statusMessage: 'Bemor tanlanmagan' })
  return { appointment: await prisma.appointment.create({
    data: { patientId, doctorId: body.doctorId ? Number(body.doctorId) : null, serviceId: body.serviceId ? Number(body.serviceId) : null, notes: body.notes ? String(body.notes) : null },
    include: { patient: true, doctor: true, service: true }
  }) }
})
