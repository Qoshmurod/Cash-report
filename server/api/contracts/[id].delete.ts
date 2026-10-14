import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { routeId } from '../../utils/catalog-items'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'CONTRACTS_MANAGE')
  const id = routeId(event)
  const contract = await prisma.contract.delete({ where: { id }, select: { number: true } })
    .catch(() => { throw createError({ statusCode: 404, statusMessage: 'Shartnoma topilmadi' }) })
  await audit(event, user, 'DELETE', 'contract', id, `Shartnoma o‘chirildi: №${contract.number}`)
  return { ok: true }
})
