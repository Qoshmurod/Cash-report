import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'PAYMENTS_VIEW')
  const query = getQuery(event)
  const department = String(query.department || '').trim()
  const search = String(query.search || '').trim()
  const doctorId = query.doctorId ? Number(query.doctorId) : undefined
  const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : undefined
  const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined
  const where = {
    ...(department ? { department } : {}),
    ...(Number.isInteger(doctorId) ? { doctorId } : {}),
    ...(user.doctorId ? { doctorId: user.doctorId } : {}),
    ...(search ? { patient: { fullName: { contains: search, mode: 'insensitive' as const } } } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {})
  }
  const payments = await prisma.payment.findMany({
    where,
    include: { patient: true, doctor: true },
    orderBy: { createdAt: 'desc' }
  })
  return { payments, totalSum: payments.reduce((sum, payment) => sum + payment.amount, 0) }
})
