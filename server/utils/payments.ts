import { prisma } from './prisma'
import { DEPARTMENT_CODES } from './catalog'
import { localDateString } from './dates'

export const paymentInclude = {
  patient: true,
  doctor: true,
  contract: { select: { id: true, number: true, organization: true } },
  createdBy: { select: { username: true, fullName: true } },
  paymentServices: { include: { service: true } }
} as const

export async function assertDayOpen(date: Date) {
  const day = localDateString(date)
  if (await prisma.dayClosure.findUnique({ where: { date: day }, select: { id: true } })) {
    throw createError({ statusCode: 409, statusMessage: `${day} kuni yopilgan. O‘zgartirish uchun super admin kunni qayta ochishi kerak` })
  }
}

// Validates the editable part of a payment shared by create and edit.
export async function parsePaymentBody(body: any) {
  const rawServiceIds: number[] = Array.isArray(body?.serviceIds)
    ? body.serviceIds.map((value: unknown) => Number(value)).filter((id: number) => Number.isInteger(id) && id > 0)
    : []
  const serviceIds = Array.from(new Set<number>(rawServiceIds))
  const method = ['CASH', 'CARD', 'TRANSFER', 'CONTRACT'].includes(String(body?.method)) ? String(body.method) as 'CASH' | 'CARD' | 'TRANSFER' | 'CONTRACT' : 'CASH'
  const amount = Number(body?.amount)
  // Contract clients may be served without cash (the organization pays by contract).
  if (!Number.isSafeInteger(amount) || amount < 0 || (amount === 0 && method !== 'CONTRACT')) {
    throw createError({ statusCode: 400, statusMessage: 'Musbat summa kiriting' })
  }
  const selectedServices = serviceIds.length
    ? await prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, department: true } })
    : []
  if (serviceIds.length !== selectedServices.length) throw createError({ statusCode: 400, statusMessage: 'Tanlangan xizmatlardan biri topilmadi' })
  const departments = [...new Set(selectedServices.map((service) => service.department).filter(Boolean))]
  const requested = String(body?.department || 'PARAZITOLOGIYA')
  const department = departments.length === 1 ? departments[0]! : DEPARTMENT_CODES.includes(requested) ? requested : 'PARAZITOLOGIYA'
  let doctorId: number | null = null
  if (body?.doctorId) {
    doctorId = Number(body.doctorId)
    if (!Number.isInteger(doctorId) || !await prisma.doctor.findUnique({ where: { id: doctorId }, select: { id: true } })) {
      throw createError({ statusCode: 400, statusMessage: 'Shifokor topilmadi' })
    }
  }
  let contractId: number | null = null
  if (method === 'CONTRACT') {
    contractId = Number(body?.contractId)
    const contract = Number.isInteger(contractId) && await prisma.contract.findUnique({ where: { id: contractId }, select: { active: true } })
    if (!contract) throw createError({ statusCode: 400, statusMessage: 'Shartnoma tanlanmagan' })
    if (!contract.active) throw createError({ statusCode: 400, statusMessage: 'Shartnoma faol emas' })
  }
  return {
    serviceIds,
    data: {
      department,
      service: body?.service ? String(body.service).trim().slice(0, 300) : null,
      amount,
      method,
      doctorId,
      contractId,
      note: body?.note ? String(body.note).trim().slice(0, 500) : null
    }
  }
}
