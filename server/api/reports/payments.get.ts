import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { parseRange } from '../../utils/dates'
import { paymentInclude } from '../../utils/payments'
import { paymentsWorkbook, sendWorkbook } from '../../utils/report'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'REPORTS_EXPORT')
  const query = getQuery(event)
  const createdAt = parseRange(query.from, query.to)
  const payments = await prisma.payment.findMany({
    where: { ...(createdAt ? { createdAt } : {}), ...(user.doctorId ? { doctorId: user.doctorId } : {}) },
    include: paymentInclude,
    orderBy: { createdAt: 'asc' }
  })
  return sendWorkbook(event, paymentsWorkbook(payments), 'cash-report.xlsx')
})
