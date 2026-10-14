import { prisma } from '../../utils/prisma'
import { requireAnyPermission } from '../../utils/auth'
import { contractListSelect } from '../../utils/contracts'
import { routeId } from '../../utils/catalog-items'

export default defineEventHandler(async (event) => {
  await requireAnyPermission(event, ['CONTRACTS_VIEW', 'CONTRACTS_MANAGE'])
  const contract = await prisma.contract.findUnique({
    where: { id: routeId(event) },
    select: { ...contractListSelect, clients: { include: { patient: true }, orderBy: { patient: { fullName: 'asc' } } } }
  })
  if (!contract) throw createError({ statusCode: 404, statusMessage: 'Shartnoma topilmadi' })
  return { contract }
})
