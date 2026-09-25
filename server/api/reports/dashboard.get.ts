import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const [payments, patients, doctors, services, appointments] = await Promise.all([
    prisma.payment.aggregate({ where: { deletedAt: null, createdAt: { gte: start } }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.patient.count(),
    prisma.doctor.count({ where: { active: true } }),
    prisma.service.count({ where: { active: true } }),
    prisma.appointment.groupBy({ by: ['status'], _count: { _all: true } })
  ])
  return {
    dailyRevenue: payments._sum.amount || 0,
    dailyPayments: payments._count._all,
    patientCount: patients,
    doctorCount: doctors,
    serviceCount: services,
    appointments: Object.fromEntries(appointments.map((item) => [item.status, item._count._all]))
  }
})
