import { prisma } from '../../utils/prisma'
import { requireAnyPermission } from '../../utils/auth'

const contractInclude = { contractClients: { select: { contract: { select: { id: true, number: true, organization: true, active: true, endDate: true } } } } } as const

export default defineEventHandler(async (event) => {
  await requireAnyPermission(event, ['PATIENTS_VIEW', 'PAYMENTS_CREATE', 'PAYMENTS_EDIT', 'APPOINTMENTS_MANAGE', 'CONTRACTS_VIEW'])
  const query = getQuery(event)
  const search = String(query.q || '').trim()
  if (search.length < 2) return { patients: [] }
  // Typing an exact contract number lists that contract's clients (registrar workflow).
  const exact = await prisma.contract.findMany({ where: { number: { equals: search, mode: 'insensitive' } }, select: { id: true } })
  if (exact.length) {
    const patients = await prisma.patient.findMany({
      where: { contractClients: { some: { contractId: { in: exact.map((contract) => contract.id) } } } },
      include: contractInclude,
      orderBy: { fullName: 'asc' },
      take: 500
    })
    return { patients, contractMatch: true }
  }
  const patients = await prisma.patient.findMany({
    where: {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { contractClients: { some: { contract: { OR: [
          { number: { contains: search, mode: 'insensitive' } },
          { organization: { contains: search, mode: 'insensitive' } }
        ] } } } }
      ]
    },
    include: contractInclude,
    orderBy: { fullName: 'asc' },
    take: 50
  })
  return { patients }
})
