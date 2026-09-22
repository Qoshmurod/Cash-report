import { prisma } from '../../../utils/prisma'
import { requirePermission } from '../../../utils/auth'
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'APPOINTMENTS_MANAGE')
  const id = Number(getRouterParam(event, 'id'))
  const status = String((await readBody(event))?.status || '')
  if (!Number.isInteger(id) || !['WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) throw createError({ statusCode: 400, statusMessage: 'Holat noto‘g‘ri' })
  const data = { status: status as any, ...(status === 'IN_PROGRESS' ? { startedAt: new Date() } : {}), ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}) }
  return { appointment: await prisma.appointment.update({ where: { id }, data, include: { patient: true, doctor: true, service: true } }) }
})
