import { prisma } from '../../utils/prisma'
import { hasPermission, requireAnyPermission } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAnyPermission(event, ['SERVICES_VIEW', 'PAYMENTS_CREATE', 'PAYMENTS_EDIT', 'APPOINTMENTS_MANAGE'])
  const all = getQuery(event).all === '1' && hasPermission(user, 'SERVICES_VIEW')
  return { services: await prisma.service.findMany({ where: all ? undefined : { active: true }, orderBy: [{ department: 'asc' }, { name: 'asc' }] }) }
})
