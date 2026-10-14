import { prisma } from '../../../utils/prisma'
import { requirePermission } from '../../../utils/auth'
import { audit } from '../../../utils/audit'
import { loadManagedUser } from '../../../utils/staff'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'STAFF_MANAGE')
  const target = await loadManagedUser(event, actor)
  if (target.id === actor.id) throw createError({ statusCode: 400, statusMessage: 'O‘zingizni deaktivatsiya qila olmaysiz' })
  const disabled = Boolean((await readBody(event))?.disabled)
  await prisma.user.update({ where: { id: target.id }, data: { disabled } })
  if (disabled) await prisma.session.deleteMany({ where: { userId: target.id } })
  await audit(event, actor, disabled ? 'DEACTIVATE' : 'ACTIVATE', 'staff', target.id, `${target.username} ${disabled ? 'deaktivatsiya qilindi' : 'faollashtirildi'}`)
  return { ok: true }
})
