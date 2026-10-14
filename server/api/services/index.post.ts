import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { parseServiceBody } from '../../utils/catalog-items'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'SERVICES_MANAGE')
  try {
    const service = await prisma.service.create({ data: parseServiceBody(await readBody(event)) })
    await audit(event, user, 'CREATE', 'service', service.id, `Xizmat qo‘shildi: ${service.name}`)
    return { service }
  } catch (error: any) {
    if (error?.code === 'P2002') throw createError({ statusCode: 409, statusMessage: 'Bu bo‘limda shu nomli xizmat mavjud' })
    throw error
  }
})
