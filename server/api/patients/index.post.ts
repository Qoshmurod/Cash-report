import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body?.fullName) throw createError({ statusCode: 400, statusMessage: 'Ism-familiya shart' })
  const fullName = String(body.fullName).trim()
  const phone = body.phone ? String(body.phone).trim() : null
  const birthYear = body.birthYear ? Number(body.birthYear) : null
  const duplicate = await prisma.patient.findFirst({ where: { fullName, phone, birthYear }, select: { id: true } })
  if (duplicate) throw createError({ statusCode: 409, statusMessage: 'Bu bemor allaqachon mavjud' })
  const patient = await prisma.patient.create({
    data: {
      fullName,
      phone,
      birthYear,
      address: body.address ? String(body.address).trim() : null,
      note: body.note ? String(body.note).trim() : null
    }
  })
  return { patient }
})
