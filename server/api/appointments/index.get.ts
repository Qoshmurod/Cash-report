import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'APPOINTMENTS_VIEW')
  const status = String(getQuery(event).status || '')
  return { appointments: await prisma.appointment.findMany({
    where: status ? { status: status as any } : undefined,
    include: { patient: true, doctor: true, service: true },
    orderBy: [{ status: 'asc' }, { scheduledAt: 'asc' }]
  }) }
})
