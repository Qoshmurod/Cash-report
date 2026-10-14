import { prisma } from '../../utils/prisma'
import { requireAnyPermission } from '../../utils/auth'
import { roleInclude, serializeRole } from '../../utils/roles'

export default defineEventHandler(async (event) => {
  await requireAnyPermission(event, ['STAFF_VIEW'])
  const roles = await prisma.role.findMany({ include: roleInclude, orderBy: { name: 'asc' } })
  return { roles: roles.map(serializeRole) }
})
