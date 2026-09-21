import { demoStore } from '../store'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  const index = demoStore.patients.findIndex((item) => item.id === id)
  if (index < 0) throw createError({ statusCode: 404, statusMessage: 'Bemor topilmadi' })
  demoStore.patients.splice(index, 1)
  for (let i = demoStore.payments.length - 1; i >= 0; i--) {
    if (demoStore.payments[i].patientId === id) demoStore.payments.splice(i, 1)
  }
  return { ok: true }
})
