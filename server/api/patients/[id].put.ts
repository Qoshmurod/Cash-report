import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Noto‘g‘ri bemor ID' })
  if (!body?.fullName) throw createError({ statusCode: 400, statusMessage: 'Ism-familiya shart' })
  const existing = await prisma.patient.findUnique({ where: { id }, select: { id: true } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Bemor topilmadi' })
  const patient = await prisma.patient.update({
    where: { id },
    data: {
      fullName: String(body.fullName).trim(),
      phone: body.phone ? String(body.phone).trim() : null,
      birthYear: body.birthYear ? Number(body.birthYear) : null,
      address: body.address ? String(body.address).trim() : null,
      note: body.note ? String(body.note).trim() : null
    }
  })
  return { patient }
})
