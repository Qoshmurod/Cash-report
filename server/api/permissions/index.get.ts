import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.isSuperAdmin && !user.grantable.length) throw createError({ statusCode: 403, statusMessage: 'Ruxsat berish huquqi yo‘q' })
  const users = await prisma.user.findMany({
    where: { role: 'OPERATOR', ...(user.isSuperAdmin ? {} : { NOT: { id: user.id } }) },
    select: {
      id: true, username: true, fullName: true, disabled: true,
      customRole: { select: { name: true, permissions: { select: { permission: { select: { code: true } } } } } },
      permissions: { select: { canGrant: true, permission: { select: { code: true } } } }
    },
    orderBy: { username: 'asc' }
  })
  return {
    grantable: user.grantable,
    canDelegate: user.isSuperAdmin,
    users: users.map((item) => ({
      id: item.id,
      username: item.username,
      fullName: item.fullName,
      disabled: item.disabled,
      roleName: item.customRole?.name || null,
      rolePermissions: item.customRole?.permissions.map((p) => p.permission.code) || [],
      grants: Object.fromEntries(item.permissions.map((p) => [p.permission.code, { canGrant: p.canGrant }]))
    }))
  }
})
