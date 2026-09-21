import { demoStore, nextId, type Patient } from '../store'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!Array.isArray(body?.patients)) {
    throw createError({ statusCode: 400, statusMessage: 'Bemorlar ro‘yxati shart' })
  }
  let added = 0
  let skipped = 0
  for (const item of body.patients) {
    const fullName = String(item?.fullName || '').trim()
    if (!fullName) {
      skipped++
      continue
    }
    const patient: Patient = {
      id: nextId(demoStore.patients),
      fullName,
      phone: item.phone ? String(item.phone).trim() : null,
      birthYear: item.birthYear ? Number(item.birthYear) : null,
      address: item.address ? String(item.address).trim() : null
    }
    demoStore.patients.push(patient)
    added++
  }
  return { added, skipped }
})
