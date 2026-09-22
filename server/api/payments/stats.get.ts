import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'

function startOfDay(date: Date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function periodStart(date: Date, days: number) {
  const value = startOfDay(date)
  value.setDate(value.getDate() - days)
  return value
}

async function totals(from: Date, doctorId?: number | null) {
  const result = await prisma.payment.aggregate({
    where: { createdAt: { gte: from }, ...(doctorId ? { doctorId } : {}) },
    _sum: { amount: true },
    _count: { _all: true }
  })
  return { total: result._sum.amount || 0, count: result._count._all }
}

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'REPORTS_DAILY')
  const now = new Date()
  const [daily, weekly, monthly, yearly, departmentStats] = await Promise.all([
    totals(startOfDay(now), user.doctorId),
    totals(periodStart(now, 7), user.doctorId),
    totals(new Date(now.getFullYear(), now.getMonth(), 1), user.doctorId),
    totals(new Date(now.getFullYear(), 0, 1), user.doctorId),
    prisma.payment.groupBy({
      by: ['department'],
      where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) }, ...(user.doctorId ? { doctorId: user.doctorId } : {}) },
      _sum: { amount: true },
      _count: { _all: true }
    })
  ])
  return {
    daily,
    weekly,
    monthly,
    yearly,
    departmentStats: departmentStats.map((item) => ({
      department: item.department,
      total: item._sum.amount || 0,
      count: item._count._all
    }))
  }
})
