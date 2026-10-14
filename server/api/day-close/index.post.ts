import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { isDateString, localDateString } from '../../utils/dates'
import { resolveClosureLines } from '../../utils/day-close'

// Closes the day with only the payment lines the user confirmed as received in the cash desk.
export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'DAY_CLOSE')
  const body = await readBody(event)
  const date = isDateString(body?.date) ? body.date : localDateString()
  if (date > localDateString()) throw createError({ statusCode: 400, statusMessage: 'Kelajakdagi kunni yopib bo‘lmaydi' })
  const lines = await resolveClosureLines(date, body?.items)
  const byMethod: Record<string, number> = {}
  for (const line of lines) byMethod[line.method] = (byMethod[line.method] || 0) + line.amount
  try {
    const closure = await prisma.dayClosure.create({
      data: {
        date,
        total: lines.reduce((sum, line) => sum + line.amount, 0),
        count: new Set(lines.map((line) => line.payment.id)).size,
        byMethod,
        note: body?.note ? String(body.note).trim().slice(0, 500) : null,
        closedById: user.id,
        closedByName: user.fullName || user.username,
        items: { create: lines.map((line) => ({ paymentId: line.payment.id, serviceId: line.serviceId, label: line.label, method: line.method, amount: line.amount })) }
      },
      include: { items: true }
    })
    await audit(event, user, 'CLOSE', 'day-close', date, `${date} kuni yopildi: ${lines.length} ta qator, ${closure.count} ta to‘lov, kassaga ${closure.total} so‘m`)
    return { closure }
  } catch (error: any) {
    if (error?.code === 'P2002') throw createError({ statusCode: 409, statusMessage: 'Bu kun allaqachon yopilgan' })
    throw error
  }
})
