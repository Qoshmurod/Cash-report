import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Noto‘g‘ri bemor ID' })
  const patient = await prisma.patient.findUnique({ where: { id }, select: { id: true } })
  if (!patient) throw createError({ statusCode: 404, statusMessage: 'Bemor topilmadi' })
  await prisma.patient.delete({ where: { id } })
  return { ok: true }
})
