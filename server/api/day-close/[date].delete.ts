import { prisma } from '../../utils/prisma'
import { requireSuperAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const date = String(getRouterParam(event, 'date') || '')
  const removed = await prisma.dayClosure.deleteMany({ where: { date } })
  if (!removed.count) throw createError({ statusCode: 404, statusMessage: 'Yopilgan kun topilmadi' })
  return { ok: true }
})
