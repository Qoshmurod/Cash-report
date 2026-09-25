import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { recordAudit } from '../../utils/audit'
import { ensureServiceCatalog } from '../../utils/service-catalog'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'PAYMENTS_CREATE')
  await ensureServiceCatalog()
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
    ? await prisma.service.findMany({ where: { id: { in: serviceIds }, active: true }, select: { id: true, department: true, name: true } })
    : []
  if (serviceIds.length !== selectedServices.length) {
    throw createError({ statusCode: 400, statusMessage: 'Tanlangan xizmatlardan biri topilmadi' })
  }
  const departments = [...new Set(selectedServices.map((service) => service.department).filter(Boolean))]
  const requestedDepartment = body.department ? String(body.department) : null
  const department = departments.length === 1
    ? departments[0]!
    : requestedDepartment || (await prisma.department.findFirst({ where: { active: true }, orderBy: { name: 'asc' } }))?.code
  if (!department) throw createError({ statusCode: 400, statusMessage: 'Bo‘lim tanlanmagan' })
  const payment = await prisma.payment.create({
    data: {
      patientId,
      department,
      service: body.service ? String(body.service) : null,
      amount,
      method: ['CASH', 'CARD', 'TRANSFER'].includes(String(body.method)) ? String(body.method) as any : 'CASH',
      doctorId: body.doctorId ? Number(body.doctorId) : null,
      note: body.note ? String(body.note) : null,
      paymentServices: serviceIds.length ? { create: serviceIds.map((serviceId: number) => ({ serviceId })) } : undefined
    },
    include: { patient: true, doctor: true, paymentServices: { include: { service: true } } }
  })
  await recordAudit(event, user, {
    action: 'CREATE',
    entity: 'Payment',
    entityId: payment.id,
    details: { patientId, amount, method: payment.method, department: payment.department }
  })
  return { payment }
})
