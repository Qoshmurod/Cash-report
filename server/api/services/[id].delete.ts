import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { routeId } from '../../utils/catalog-items'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'SERVICES_MANAGE')
  const id = routeId(event)
  const service = await prisma.service.findUnique({ where: { id } })
  if (!service) throw createError({ statusCode: 404, statusMessage: 'Xizmat topilmadi' })
  await prisma.$transaction(async (tx) => {
    // Keep the service name on historical payments before the link rows are removed.
    const links = await tx.paymentService.findMany({ where: { serviceId: id }, include: { payment: { select: { id: true, service: true } } } })
    for (const link of links) {
      const service_ = link.payment.service ? `${link.payment.service}, ${service.name}` : service.name
      await tx.payment.update({ where: { id: link.payment.id }, data: { service: service_ } })
    }
    await tx.paymentService.deleteMany({ where: { serviceId: id } })
    await tx.service.delete({ where: { id } })
  })
  await audit(event, user, 'DELETE', 'service', id, `Xizmat o‘chirildi: ${service.name}`)
  return { ok: true }
})
