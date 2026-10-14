import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { dayEnd, dayStart, isDateString } from '../../utils/dates'
import { paymentInclude } from '../../utils/payments'
import { paymentsWorkbook, sendWorkbook } from '../../utils/report'

// Downloads only the payments the user ticked for the chosen day.
export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'DAY_CLOSE')
  const body = await readBody(event)
  if (!isDateString(body?.date)) throw createError({ statusCode: 400, statusMessage: 'Sana noto‘g‘ri' })
  const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Number.isInteger) : []
  if (!ids.length) throw createError({ statusCode: 400, statusMessage: 'Kamida bitta to‘lovni tanlang' })
  const payments = await prisma.payment.findMany({
    where: { id: { in: ids }, createdAt: { gte: dayStart(body.date), lte: dayEnd(body.date) } },
    include: paymentInclude,
    orderBy: { createdAt: 'asc' }
  })
  await audit(event, user, 'EXPORT', 'day-close', body.date, `${body.date} kunidan ${payments.length} ta to‘lov yuklab olindi`)
  return sendWorkbook(event, await paymentsWorkbook(payments, `Kun ${body.date}`), `kun-${body.date}.xlsx`)
})
