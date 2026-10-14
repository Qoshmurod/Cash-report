import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { dayEnd, dayStart, isDateString, localDateString } from '../../utils/dates'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'DAY_CLOSE')
  const body = await readBody(event)
  const date = isDateString(body?.date) ? body.date : localDateString()
  if (date > localDateString()) throw createError({ statusCode: 400, statusMessage: 'Kelajakdagi kunni yopib bo‘lmaydi' })
  const payments = await prisma.payment.findMany({ where: { createdAt: { gte: dayStart(date), lte: dayEnd(date) } }, select: { amount: true, method: true } })
  const byMethod: Record<string, number> = {}
  for (const payment of payments) byMethod[payment.method] = (byMethod[payment.method] || 0) + payment.amount
  try {
    const closure = await prisma.dayClosure.create({
      data: {
        date,
        total: payments.reduce((sum, payment) => sum + payment.amount, 0),
        count: payments.length,
        byMethod,
        note: body?.note ? String(body.note).trim().slice(0, 500) : null,
        closedById: user.id,
        closedByName: user.fullName || user.username
      }
    })
    await audit(event, user, 'CLOSE', 'day-close', date, `${date} kuni yopildi: ${closure.count} ta to‘lov, ${closure.total} so‘m`)
    return { closure }
  } catch (error: any) {
    if (error?.code === 'P2002') throw createError({ statusCode: 409, statusMessage: 'Bu kun allaqachon yopilgan' })
    throw error
  }
})
