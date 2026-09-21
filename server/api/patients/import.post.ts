import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!Array.isArray(body?.patients)) {
    throw createError({ statusCode: 400, statusMessage: 'Bemorlar ro‘yxati shart' })
  }
  const rows = body.patients
    .map((item: Record<string, unknown>) => ({
      fullName: String(item?.fullName || '').trim(),
      phone: item?.phone ? String(item.phone).trim() : null,
      birthYear: item?.birthYear ? Number(item.birthYear) : null,
      address: item?.address ? String(item.address).trim() : null
    }))
    .filter((item: { fullName: string }) => item.fullName)
  if (rows.length) await prisma.patient.createMany({ data: rows })
  return { added: rows.length, skipped: body.patients.length - rows.length }
})
