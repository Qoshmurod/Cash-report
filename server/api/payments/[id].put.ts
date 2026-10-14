import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { assertDayOpen, parsePaymentBody, paymentInclude } from '../../utils/payments'
import { routeId } from '../../utils/catalog-items'

// Corrects an overpaid or mistyped payment; the reason and old values are kept in the audit log.
export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'PAYMENTS_EDIT')
  const id = routeId(event)
  const before = await prisma.payment.findUnique({ where: { id }, include: { paymentServices: true } })
  if (!before) throw createError({ statusCode: 404, statusMessage: 'To‘lov topilmadi' })
  await assertDayOpen(before.createdAt)
  const body = await readBody(event)
  const reason = String(body?.reason || '').trim()
  if (!reason) throw createError({ statusCode: 400, statusMessage: 'Tahrirlash sababini kiriting' })
  const { serviceIds, data } = await parsePaymentBody(body)
  if (data.contractId && !await prisma.contractClient.findUnique({ where: { contractId_patientId: { contractId: data.contractId, patientId: before.patientId } } })) {
    throw createError({ statusCode: 400, statusMessage: 'Bemor ushbu shartnoma ro‘yxatida yo‘q' })
  }
  const payment = await prisma.$transaction(async (tx) => {
    await tx.paymentService.deleteMany({ where: { paymentId: id } })
    return tx.payment.update({
      where: { id },
      data: { ...data, editedAt: new Date(), editReason: reason.slice(0, 500), paymentServices: serviceIds.length ? { create: serviceIds.map((serviceId) => ({ serviceId })) } : undefined },
      include: paymentInclude
    })
  })
  await audit(event, user, 'UPDATE', 'payment', id, `To‘lov #${id} tahrirlandi: ${before.amount} → ${payment.amount} so‘m. Sabab: ${reason}`, {
    before: { amount: before.amount, method: before.method, department: before.department, serviceIds: before.paymentServices.map((item) => item.serviceId), note: before.note },
    after: { ...data, serviceIds }
  })
  return { payment }
})
