import { demoStore } from '../store'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const patient = demoStore.patients.find((item) => item.id === id)
  const body = await readBody(event)
  if (!patient) throw createError({ statusCode: 404, statusMessage: 'Bemor topilmadi' })
  if (!body?.fullName) throw createError({ statusCode: 400, statusMessage: 'Ism-familiya shart' })
  Object.assign(patient, {
    fullName: String(body.fullName).trim(),
    phone: body.phone ? String(body.phone).trim() : null,
    birthYear: body.birthYear ? Number(body.birthYear) : null,
    address: body.address ? String(body.address).trim() : null,
    note: body.note ? String(body.note).trim() : null
  })
  return { patient }
})
