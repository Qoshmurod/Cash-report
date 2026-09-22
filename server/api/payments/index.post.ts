import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'PAYMENTS_CREATE')
  const body = await readBody(event)
  const patientId = Number(body?.patientId)
  const amount = Number(body?.amount)
  if (!Number.isInteger(patientId) || !Number.isSafeInteger(amount) || amount <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bemor va musbat summa shart' })
  }
  const patient = await prisma.patient.findUnique({ where: { id: patientId } })
  if (!patient) throw createError({ statusCode: 404, statusMessage: 'Bemor topilmadi' })
  const payment = await prisma.payment.create({
    data: {
      patientId,
      department: String(body.department || 'PARAZITOLOGIYA'),
      service: body.service ? String(body.service) : null,
      amount,
      method: ['CASH', 'CARD', 'TRANSFER'].includes(String(body.method)) ? String(body.method) as any : 'CASH',
      doctorId: body.doctorId ? Number(body.doctorId) : null,
      note: body.note ? String(body.note) : null
    },
    include: { patient: true, doctor: true }
  })
  return { payment }
})
