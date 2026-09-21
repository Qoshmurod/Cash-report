import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Noto‘g‘ri to‘lov ID' })
  const payment = await prisma.payment.findUnique({ where: { id } })
  if (!payment) throw createError({ statusCode: 404, statusMessage: 'To‘lov topilmadi' })
  await prisma.payment.delete({ where: { id } })
  return { ok: true }
})
