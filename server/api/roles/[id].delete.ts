import { prisma } from '../../utils/prisma'
import { requireSuperAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Noto‘g‘ri rol ID' })
  await prisma.role.delete({ where: { id } }).catch(() => { throw createError({ statusCode: 404, statusMessage: 'Rol topilmadi' }) })
  return { ok: true }
})
