import { prisma } from '../../utils/prisma'
import { hasPermission, requireAuth } from '../../utils/auth'
import { parseRange } from '../../utils/dates'
import { paymentInclude } from '../../utils/payments'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const department = String(query.department || '').trim()
  // Department workstations see only their own department queue; full history needs PAYMENTS_VIEW.
  const departmentOnly = !hasPermission(user, 'PAYMENTS_VIEW')
  if (departmentOnly && !(hasPermission(user, 'DEPARTMENTS_VIEW') && department && user.departments.includes(department))) {
    throw createError({ statusCode: 403, statusMessage: 'Ruxsat yetarli emas' })
  }
  const search = String(query.search || '').trim()
  const doctorId = query.doctorId ? Number(query.doctorId) : undefined
  const contractId = query.contractId ? Number(query.contractId) : undefined
  const method = ['CASH', 'CARD', 'TRANSFER', 'CONTRACT'].includes(String(query.method)) ? String(query.method) as any : undefined
  const createdAt = parseRange(query.from, query.to)
  const where = {
    ...(department ? { OR: [{ department }, { paymentServices: { some: { service: { department } } } }] } : {}),
    ...(Number.isInteger(doctorId) ? { doctorId } : {}),
    ...(user.doctorId ? { doctorId: user.doctorId } : {}),
    ...(Number.isInteger(contractId) ? { contractId } : {}),
    ...(method ? { method } : {}),
    ...(search ? { patient: { fullName: { contains: search, mode: 'insensitive' as const } } } : {}),
    ...(createdAt ? { createdAt } : {})
  }
  const payments = await prisma.payment.findMany({ where, include: paymentInclude, orderBy: { createdAt: 'desc' }, take: 2000 })
  return { payments, totalSum: payments.reduce((sum, payment) => sum + payment.amount, 0) }
})
