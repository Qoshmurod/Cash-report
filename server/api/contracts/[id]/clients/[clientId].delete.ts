import { prisma } from '../../../../utils/prisma'
import { requirePermission } from '../../../../utils/auth'
import { audit } from '../../../../utils/audit'
import { routeId } from '../../../../utils/catalog-items'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'CONTRACTS_MANAGE')
  const contractId = routeId(event)
  const clientId = Number(getRouterParam(event, 'clientId'))
  const removed = await prisma.contractClient.deleteMany({ where: { id: clientId, contractId } })
  if (!removed.count) throw createError({ statusCode: 404, statusMessage: 'Mijoz topilmadi' })
  await audit(event, user, 'DELETE', 'contract-client', clientId, `Shartnoma #${contractId} ro‘yxatidan mijoz olib tashlandi`)
  return { ok: true }
})
