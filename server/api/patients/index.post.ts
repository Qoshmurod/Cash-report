import { demoStore, nextId, type Patient } from '../store'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body?.fullName) throw createError({ statusCode: 400, statusMessage: 'Ism-familiya shart' })
  const patient: Patient = {
    id: nextId(demoStore.patients),
    fullName: String(body.fullName).trim(),
    phone: body.phone ? String(body.phone).trim() : null,
    birthYear: body.birthYear ? Number(body.birthYear) : null,
    address: body.address ? String(body.address).trim() : null,
    note: body.note ? String(body.note).trim() : null
  }
  demoStore.patients.push(patient)
  return { patient }
})
