import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { loadManagedUser } from '../../utils/staff'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'STAFF_MANAGE')
  const target = await loadManagedUser(event, actor)
  if (target.id === actor.id) throw createError({ statusCode: 400, statusMessage: 'O‘zingizni o‘chira olmaysiz' })
  if (target.role !== 'OPERATOR' && await prisma.user.count({ where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } } }) <= 1) {
    throw createError({ statusCode: 400, statusMessage: 'Oxirgi super adminni o‘chirib bo‘lmaydi' })
  }
  await prisma.user.delete({ where: { id: target.id } })
  await audit(event, actor, 'DELETE', 'staff', target.id, `Xodim o‘chirildi: ${target.username}`)
  return { ok: true }
})
