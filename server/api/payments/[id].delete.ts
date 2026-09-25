import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'DATA_EDIT')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Noto‘g‘ri to‘lov ID' })
  const payment = await prisma.payment.findUnique({ where: { id } })
  if (!payment) throw createError({ statusCode: 404, statusMessage: 'To‘lov topilmadi' })
  await prisma.payment.update({ where: { id }, data: { deletedAt: new Date() } })
  return { ok: true }
})
