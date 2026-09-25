import { requireAnyPermission } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { ensureServiceCatalog } from '../../utils/service-catalog'

export default defineEventHandler(async (event) => {
  await requireAnyPermission(event, ['SERVICES_VIEW', 'PAYMENTS_CREATE'])
  await ensureServiceCatalog()
  return {
    departments: await prisma.department.findMany({
      where: { active: true },
      include: { services: { where: { active: true }, orderBy: { name: 'asc' } } },
      orderBy: { name: 'asc' }
    })
  }
})
