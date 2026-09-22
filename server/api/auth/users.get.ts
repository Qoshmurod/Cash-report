import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event, ['SUPER_ADMIN'])
  return { users: await prisma.user.findMany({ select: { id: true, username: true, role: true, disabled: true, mustChangePassword: true, createdAt: true }, orderBy: { id: 'asc' } }) }
})
