import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body?.fullName) throw createError({ statusCode: 400, statusMessage: 'Ism-familiya shart' })
  const patient = await prisma.patient.create({
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
