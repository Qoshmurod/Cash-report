import { prisma } from '../../utils/prisma'
import { requireAnyPermission } from '../../utils/auth'
import { ensureServiceCatalog } from '../../utils/service-catalog'
export default defineEventHandler(async (event) => {
  await requireAnyPermission(event, ['SERVICES_VIEW', 'PAYMENTS_CREATE'])
  await ensureServiceCatalog()
  const query = getQuery(event)
  const department = String(query.department || '').trim()
  return {
    services: await prisma.service.findMany({
      where: { active: true, ...(department ? { OR: [{ department }, { departmentRef: { code: department } }] } : {}) },
      include: { departmentRef: true },
      orderBy: { name: 'asc' }
    })
  }
})
