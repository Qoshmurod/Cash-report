import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'

import { dayStart, localDateString } from '../../utils/dates'

function periodStart(days: number) {
  return new Date(dayStart(localDateString()).getTime() - days * 24 * 60 * 60 * 1000)
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
  const today = localDateString()
  const monthStart = dayStart(`${today.slice(0, 7)}-01`)
  const yearStart = dayStart(`${today.slice(0, 4)}-01-01`)
  const [daily, weekly, monthly, yearly, departmentStats] = await Promise.all([
    totals(dayStart(today), user.doctorId),
    totals(periodStart(7), user.doctorId),
    totals(monthStart, user.doctorId),
    totals(yearStart, user.doctorId),
    prisma.payment.groupBy({
      by: ['department'],
      where: { createdAt: { gte: monthStart }, ...(user.doctorId ? { doctorId: user.doctorId } : {}) },
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
