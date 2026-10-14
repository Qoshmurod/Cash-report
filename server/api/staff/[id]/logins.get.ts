import { prisma } from '../../../utils/prisma'
import { requirePermission } from '../../../utils/auth'
import { loadManagedUser } from '../../../utils/staff'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'STAFF_VIEW')
  const target = await loadManagedUser(event, actor)
  return { logins: await prisma.loginEvent.findMany({ where: { userId: target.id }, orderBy: { createdAt: 'desc' }, take: 200 }) }
})
