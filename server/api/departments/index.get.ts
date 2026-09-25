import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { ensureServiceCatalog } from '../../utils/service-catalog'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  await ensureServiceCatalog()
  return { departments: await prisma.department.findMany({ where: { active: true }, orderBy: { name: 'asc' } }) }
})
