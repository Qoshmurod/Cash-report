import { prisma } from '../../utils/prisma'
import { requireAnyPermission } from '../../utils/auth'
import { ensureServiceCatalog } from '../../utils/service-catalog'
export default defineEventHandler(async (event) => {
  await requireAnyPermission(event, ['SERVICES_VIEW', 'PAYMENTS_CREATE'])
  await ensureServiceCatalog()
  return { services: await prisma.service.findMany({ where: { active: true }, orderBy: { name: 'asc' } }) }
})
