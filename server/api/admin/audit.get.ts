import { requireAuth } from '../../utils/auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requireAuth(event, ['SUPER_ADMIN'])
  const query = getQuery(event)
  const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 500)
  return {
    logs: await prisma.auditLog.findMany({
      take: limit,
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' }
    })
  }
})
