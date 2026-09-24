import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'SERVICES_MANAGE')
  const body = await readBody(event)
  const name = String(body?.name || '').trim()
  const price = Number(body?.price)
  if (!name || !Number.isSafeInteger(price) || price < 0) throw createError({ statusCode: 400, statusMessage: 'Xizmat nomi va narxi noto‘g‘ri' })
  const departmentCode = body.department ? String(body.department).trim().toUpperCase() : ''
  const department = departmentCode ? await prisma.department.findUnique({ where: { code: departmentCode } }) : null
  if (departmentCode && !department) throw createError({ statusCode: 404, statusMessage: 'Bo‘lim topilmadi' })
  return { service: await prisma.service.create({ data: { name, price, department: department?.code || null, departmentId: department?.id || null } }) }
})
