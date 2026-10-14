import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { parseContractFields } from '../../utils/contracts'
import { routeId } from '../../utils/catalog-items'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'CONTRACTS_MANAGE')
  const id = routeId(event)
  const data = parseContractFields(await readBody(event) || {})
  const contract = await prisma.contract.update({ where: { id }, data, select: { id: true, number: true } })
    .catch(() => { throw createError({ statusCode: 404, statusMessage: 'Shartnoma topilmadi' }) })
  await audit(event, user, 'UPDATE', 'contract', id, `Shartnoma tahrirlandi: №${contract.number}`, data)
  return { contract }
})
