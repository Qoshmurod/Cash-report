import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'LOGIN_HISTORY_VIEW')
  const query = getQuery(event)
  const username = String(query.username || '').trim()
  return {
    history: await prisma.loginHistory.findMany({
      where: username ? { username: { contains: username, mode: 'insensitive' } } : undefined,
      orderBy: { loginAt: 'desc' },
      take: 500
    })
  }
})
