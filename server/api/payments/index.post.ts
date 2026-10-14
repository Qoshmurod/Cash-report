import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { assertDayOpen, parsePaymentBody, paymentInclude } from '../../utils/payments'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'PAYMENTS_CREATE')
  const body = await readBody(event)
  const patientId = Number(body?.patientId)
  if (!Number.isInteger(patientId)) throw createError({ statusCode: 400, statusMessage: 'Bemor tanlanmagan' })
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true, fullName: true } })
  if (!patient) throw createError({ statusCode: 404, statusMessage: 'Bemor topilmadi' })
  await assertDayOpen(new Date())
  const { serviceIds, data } = await parsePaymentBody(body)
  if (data.contractId && !await prisma.contractClient.findUnique({ where: { contractId_patientId: { contractId: data.contractId, patientId } } })) {
    throw createError({ statusCode: 400, statusMessage: 'Bemor ushbu shartnoma ro‘yxatida yo‘q' })
  }
  const payment = await prisma.payment.create({
    data: {
      ...data,
      patientId,
      createdById: user.id,
      paymentServices: serviceIds.length ? { create: serviceIds.map((serviceId) => ({ serviceId })) } : undefined
    },
    include: paymentInclude
  })
  await audit(event, user, 'CREATE', 'payment', payment.id, `To‘lov #${payment.id}: ${patient.fullName}, ${payment.amount} so‘m (${payment.method})`)
  return { payment }
})
