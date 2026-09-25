import { prisma } from '../../utils/prisma'
import { requirePermission, writeAudit } from '../../utils/auth'
export default defineEventHandler(async (event) => {
  const cashier = await requirePermission(event, 'PAYMENTS_CREATE')
  const body = await readBody(event)
  const rawServiceIds: number[] = Array.isArray(body?.serviceIds)
    ? body.serviceIds.map((value: unknown) => Number(value)).filter((id: number) => Number.isInteger(id) && id > 0)
    : []
  const serviceIds: number[] = Array.from(new Set<number>(rawServiceIds))
  const patientId = Number(body?.patientId)
  const amount = Number(body?.amount)
  if (!Number.isInteger(patientId) || !Number.isSafeInteger(amount) || amount <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bemor va musbat summa shart' })
  }
  const patient = await prisma.patient.findUnique({ where: { id: patientId } })
  if (!patient) throw createError({ statusCode: 404, statusMessage: 'Bemor topilmadi' })
  const selectedServices = serviceIds.length
    ? await prisma.service.findMany({ where: { id: { in: serviceIds }, active: true }, select: { id: true, department: true, departmentId: true, name: true, price: true } })
    : []
  if (serviceIds.length !== selectedServices.length) {
    throw createError({ statusCode: 400, statusMessage: 'Tanlangan xizmatlardan biri topilmadi' })
  }
  const departments = [...new Set(selectedServices.map((service) => service.department).filter(Boolean))]
  const department = departments.length === 1 ? departments[0]! : String(body.department || 'PARAZITOLOGIYA')
  if (departments.length > 1) throw createError({ statusCode: 400, statusMessage: 'Bir to‘lovda faqat bitta bo‘lim xizmatlarini tanlang' })
  const departmentRecord = selectedServices[0]?.departmentId
    ? await prisma.department.findUnique({ where: { id: selectedServices[0].departmentId } })
    : await prisma.department.findUnique({ where: { code: department } })
  if (!departmentRecord) throw createError({ statusCode: 400, statusMessage: 'Bo‘lim topilmadi' })
  const expectedAmount = selectedServices.reduce((sum, service) => sum + service.price, 0)
  if (serviceIds.length && amount !== expectedAmount) {
    throw createError({ statusCode: 400, statusMessage: 'Summa xizmatlar narxiga mos emas' })
  }
  const payment = await prisma.payment.create({
    data: {
      patientId,
      department,
      departmentId: departmentRecord.id,
      service: body.service ? String(body.service) : null,
      amount,
      method: ['CASH', 'CARD', 'TRANSFER'].includes(String(body.method)) ? String(body.method) as any : 'CASH',
      doctorId: body.doctorId ? Number(body.doctorId) : null,
      cashierId: cashier.id,
      note: body.note ? String(body.note) : null,
      paymentServices: serviceIds.length ? { create: serviceIds.map((serviceId: number) => ({ serviceId })) } : undefined
    },
    include: { patient: true, doctor: true, paymentServices: { include: { service: true } } }
  })
  await writeAudit(event, { userId: cashier.id, action: 'CREATE', entity: 'Payment', entityId: payment.id, next: payment })
  return { payment }
})
