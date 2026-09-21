import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
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
      note: body.note ? String(body.note) : null
    },
    include: { patient: true }
  })
  return { payment }
})
