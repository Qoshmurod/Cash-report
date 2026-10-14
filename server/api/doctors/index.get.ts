import { prisma } from '../../utils/prisma'
import { hasPermission, requireAnyPermission } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAnyPermission(event, ['DOCTORS_VIEW', 'PAYMENTS_CREATE', 'PAYMENTS_EDIT', 'APPOINTMENTS_MANAGE', 'STAFF_VIEW'])
  const all = getQuery(event).all === '1' && hasPermission(user, 'DOCTORS_VIEW')
  return { doctors: await prisma.doctor.findMany({ where: all ? undefined : { active: true }, orderBy: { fullName: 'asc' } }) }
})
