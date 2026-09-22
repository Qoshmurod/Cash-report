import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'DOCTORS_VIEW')
  return { doctors: await prisma.doctor.findMany({ where: { active: true }, orderBy: { fullName: 'asc' } }) }
})
