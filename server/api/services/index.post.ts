import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { ensureServiceCatalog } from '../../utils/service-catalog'
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'SERVICES_MANAGE')
  await ensureServiceCatalog()
  const body = await readBody(event)
  const name = String(body?.name || '').trim()
  const price = Number(body?.price)
  if (!name || !Number.isSafeInteger(price) || price < 0) throw createError({ statusCode: 400, statusMessage: 'Xizmat nomi va narxi noto‘g‘ri' })
  const department = body.department ? await prisma.department.findUnique({ where: { code: String(body.department) } }) : null
  if (body.department && !department) throw createError({ statusCode: 400, statusMessage: 'Bo‘lim topilmadi' })
  return {
    service: await prisma.service.create({
      data: {
        name,
        price,
        department: department?.code || null,
        departmentId: department?.id || null
      }
    })
  }
})
