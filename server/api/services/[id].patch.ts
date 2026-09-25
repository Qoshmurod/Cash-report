import { prisma } from '../../utils/prisma'
import { requirePermission, writeAudit } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'DATA_EDIT')
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Xizmat ID noto‘g‘ri' })
  const data: { name?: string; price?: number; active?: boolean; departmentId?: number | null; department?: string | null } = {}
  if (body?.name !== undefined) data.name = String(body.name).trim()
  if (body?.price !== undefined) {
    const price = Number(body.price)
    if (!Number.isSafeInteger(price) || price < 0) throw createError({ statusCode: 400, statusMessage: 'Narx noto‘g‘ri' })
    data.price = price
  }
  if (body?.active !== undefined) data.active = Boolean(body.active)
  if (body?.departmentId !== undefined) {
    const departmentId = Number(body.departmentId)
    if (!Number.isInteger(departmentId)) throw createError({ statusCode: 400, statusMessage: 'Bo‘lim noto‘g‘ri' })
    const department = await prisma.department.findUnique({ where: { id: departmentId } })
    if (!department) throw createError({ statusCode: 404, statusMessage: 'Bo‘lim topilmadi' })
    data.departmentId = department.id
    data.department = department.code
  }
  const previous = await prisma.service.findUnique({ where: { id } })
  if (!previous) throw createError({ statusCode: 404, statusMessage: 'Xizmat topilmadi' })
  const service = await prisma.service.update({ where: { id }, data })
  await writeAudit(event, { userId: user.id, action: 'UPDATE', entity: 'Service', entityId: id, previous, next: service })
  return { service }
})
