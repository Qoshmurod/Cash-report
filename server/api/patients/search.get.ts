import { prisma } from '../../utils/prisma'
import { requireAnyPermission } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAnyPermission(event, ['PATIENTS_VIEW', 'PAYMENTS_CREATE', 'PAYMENTS_EDIT', 'APPOINTMENTS_MANAGE', 'CONTRACTS_VIEW'])
  const query = getQuery(event)
  const search = String(query.q || '').trim()
  if (search.length < 2) return { patients: [] }
  const patients = await prisma.patient.findMany({
    where: {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } }
      ]
    },
    // Contract clients show which contract (organization) they come under.
    include: { contractClients: { select: { contract: { select: { id: true, number: true, organization: true, active: true, endDate: true } } } } },
    orderBy: { fullName: 'asc' },
    take: 20
  })
  return { patients }
})
