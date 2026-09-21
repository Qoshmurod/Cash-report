import { demoStore } from '../store'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  const index = demoStore.payments.findIndex((item) => item.id === id)
  if (index < 0) throw createError({ statusCode: 404, statusMessage: 'To‘lov topilmadi' })
  demoStore.payments.splice(index, 1)
  return { ok: true }
})
