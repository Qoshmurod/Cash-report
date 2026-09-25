import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { recordAudit } from '../../utils/audit'
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['SUPER_ADMIN'])
  const body = await readBody(event)
  const userId = Number(body?.userId)
  const permissionId = Number(body?.permissionId)
  const enabled = Boolean(body?.enabled)
  if (!Number.isInteger(userId) || !Number.isInteger(permissionId)) throw createError({ statusCode: 400, statusMessage: 'Ruxsat ma’lumoti noto‘g‘ri' })
  if (enabled) await prisma.userPermission.upsert({ where: { userId_permissionId: { userId, permissionId } }, create: { userId, permissionId }, update: {} })
  else await prisma.userPermission.delete({ where: { userId_permissionId: { userId, permissionId } } }).catch(() => {})
  await recordAudit(event, user, {
    action: enabled ? 'GRANT' : 'REVOKE',
    entity: 'UserPermission',
    entityId: userId,
    details: { permissionId, enabled }
  })
  return { ok: true }
})
