import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { assertDayOpen } from '../../utils/payments'
import { routeId } from '../../utils/catalog-items'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'PAYMENTS_DELETE')
  const id = routeId(event)
  const payment = await prisma.payment.findUnique({ where: { id }, include: { patient: { select: { fullName: true } } } })
  if (!payment) throw createError({ statusCode: 404, statusMessage: 'To‘lov topilmadi' })
  await assertDayOpen(payment.createdAt)
  await prisma.payment.delete({ where: { id } })
  await audit(event, user, 'DELETE', 'payment', id, `To‘lov #${id} o‘chirildi: ${payment.patient.fullName}, ${payment.amount} so‘m`)
  return { ok: true }
})
