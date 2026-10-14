import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { dayEnd, dayStart, isDateString, localDateString } from '../../utils/dates'
import { paymentInclude } from '../../utils/payments'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'DAY_CLOSE')
  const date = isDateString(getQuery(event).date) ? String(getQuery(event).date) : localDateString()
  const [payments, closure, recent] = await Promise.all([
    prisma.payment.findMany({ where: { createdAt: { gte: dayStart(date), lte: dayEnd(date) } }, include: paymentInclude, orderBy: { createdAt: 'asc' } }),
    prisma.dayClosure.findUnique({ where: { date }, include: { items: true } }),
    prisma.dayClosure.findMany({ orderBy: { date: 'desc' }, take: 30 })
  ])
  return { date, payments, closure, recent }
})
