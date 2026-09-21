import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = String(query.search || '').trim()
  const page = Math.max(1, Number(query.page) || 1)
  const where = search
    ? { OR: [{ fullName: { contains: search, mode: 'insensitive' as const } }, { phone: { contains: search } }] }
    : undefined
  const [patients, total] = await Promise.all([
    prisma.patient.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 50, take: 50 }),
    prisma.patient.count({ where })
  ])
  return { patients, total }
})
