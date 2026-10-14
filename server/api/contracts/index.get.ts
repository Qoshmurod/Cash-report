import { prisma } from '../../utils/prisma'
import { requireAnyPermission } from '../../utils/auth'
import { contractListSelect } from '../../utils/contracts'

export default defineEventHandler(async (event) => {
  await requireAnyPermission(event, ['CONTRACTS_VIEW', 'CONTRACTS_MANAGE', 'PAYMENTS_CREATE', 'DAY_CLOSE', 'GUARANTEE_LETTERS_UPLOAD'])
  return { contracts: await prisma.contract.findMany({ select: contractListSelect, orderBy: { createdAt: 'desc' } }) }
})
