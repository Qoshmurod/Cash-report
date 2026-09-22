import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'SERVICES_MANAGE')
  const body = await readBody(event)
  const name = String(body?.name || '').trim()
  const price = Number(body?.price)
  if (!name || !Number.isSafeInteger(price) || price < 0) throw createError({ statusCode: 400, statusMessage: 'Xizmat nomi va narxi noto‘g‘ri' })
  return { service: await prisma.service.create({ data: { name, price, department: body.department ? String(body.department) : null } }) }
})
