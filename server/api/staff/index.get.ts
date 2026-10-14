import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'STAFF_VIEW')
  const users = await prisma.user.findMany({
    where: user.isSuperAdmin ? undefined : { role: 'OPERATOR' },
    select: {
      id: true, username: true, fullName: true, phone: true, position: true, role: true, roleId: true, doctorId: true,
      disabled: true, mustChangePassword: true, lastLoginAt: true, createdAt: true,
      customRole: { select: { name: true } }, doctor: { select: { fullName: true } }
    },
    orderBy: { id: 'asc' }
  })
  return { users }
})
