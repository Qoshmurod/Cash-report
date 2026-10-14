import { prisma } from '../../utils/prisma'
import { requireAnyPermission } from '../../utils/auth'
import { parseRange } from '../../utils/dates'

export default defineEventHandler(async (event) => {
  await requireAnyPermission(event, ['PATIENTS_VIEW', 'PAYMENTS_CREATE', 'APPOINTMENTS_MANAGE'])
  const query = getQuery(event)
  const search = String(query.search || '').trim()
  const page = Math.max(1, Number(query.page) || 1)
  const createdAt = parseRange(query.from, query.to)
  const where = {
    ...(search ? { OR: [
      { fullName: { contains: search, mode: 'insensitive' as const } },
      { phone: { contains: search } },
      { contractClients: { some: { contract: { OR: [{ number: { contains: search, mode: 'insensitive' as const } }, { organization: { contains: search, mode: 'insensitive' as const } }] } } } }
    ] } : {}),
    ...(createdAt ? { createdAt } : {})
  }
  const [patients, total] = await Promise.all([
    prisma.patient.findMany({ where, include: { contractClients: { select: { contract: { select: { id: true, number: true, organization: true } } } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 50, take: 50 }),
    prisma.patient.count({ where })
  ])
  return { patients, total }
})
