import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'SERVICES_VIEW')
  return { services: await prisma.service.findMany({ where: { active: true }, orderBy: { name: 'asc' } }) }
})
