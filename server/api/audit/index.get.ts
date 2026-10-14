import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { parseRange } from '../../utils/dates'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'AUDIT_VIEW')
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const createdAt = parseRange(query.from, query.to)
  const search = String(query.search || '').trim()
  const where = {
    ...(createdAt ? { createdAt } : {}),
    ...(query.entity ? { entity: String(query.entity) } : {}),
    ...(search ? { OR: [{ username: { contains: search, mode: 'insensitive' as const } }, { summary: { contains: search, mode: 'insensitive' as const } }] } : {})
  }
  const [logs, total, logins] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 100, take: 100 }),
    prisma.auditLog.count({ where }),
    prisma.loginEvent.findMany({ where: createdAt ? { createdAt } : undefined, orderBy: { createdAt: 'desc' }, take: 100 })
  ])
  return { logs, total, logins }
})
