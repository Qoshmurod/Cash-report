import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { parseServiceBody, routeId } from '../../utils/catalog-items'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'SERVICES_MANAGE')
  const id = routeId(event)
  const before = await prisma.service.findUnique({ where: { id } })
  if (!before) throw createError({ statusCode: 404, statusMessage: 'Xizmat topilmadi' })
  try {
    const service = await prisma.service.update({ where: { id }, data: parseServiceBody(await readBody(event)) })
    await audit(event, user, 'UPDATE', 'service', id, `Xizmat tahrirlandi: ${service.name}`, { before, after: service })
    return { service }
  } catch (error: any) {
    if (error?.code === 'P2002') throw createError({ statusCode: 409, statusMessage: 'Bu bo‘limda shu nomli xizmat mavjud' })
    throw error
  }
})
