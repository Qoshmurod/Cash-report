import { demoStore, nextId, type Payment } from '../store'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const patient = demoStore.patients.find((item) => item.id === Number(body?.patientId))
  const amount = Number(body?.amount)
  if (!patient || !Number.isFinite(amount) || amount <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bemor va musbat summa shart' })
  }
  const payment: Payment = {
    id: nextId(demoStore.payments),
    patientId: patient.id,
    department: String(body.department || 'PARAZITOLOGIYA'),
    service: body.service ? String(body.service) : null,
    amount,
    note: body.note ? String(body.note) : null,
    createdAt: new Date().toISOString(),
    patient
  }
  demoStore.payments.unshift(payment)
  return { payment }
})
