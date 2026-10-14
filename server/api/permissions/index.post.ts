import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'
import { PERMISSION_CODES } from '../../utils/catalog'
import { audit } from '../../utils/audit'

// Super admin grants any permission (optionally with the right to pass it on).
// A delegate may grant/revoke only permissions it holds with canGrant, and never the canGrant flag itself.
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const userId = Number(body?.userId)
  const code = String(body?.code || '')
  const enabled = Boolean(body?.enabled)
  const canGrant = Boolean(body?.canGrant)
  if (!Number.isInteger(userId) || !PERMISSION_CODES.has(code)) throw createError({ statusCode: 400, statusMessage: 'Ruxsat ma’lumoti noto‘g‘ri' })
  if (!user.isSuperAdmin && (!user.grantable.includes(code) || canGrant || userId === user.id)) {
    throw createError({ statusCode: 403, statusMessage: 'Bu ruxsatni berish huquqingiz yo‘q' })
  }
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, username: true } })
  if (!target || target.role !== 'OPERATOR') throw createError({ statusCode: 404, statusMessage: 'Xodim topilmadi' })
  const permission = await prisma.permission.findUnique({ where: { code } })
  if (!permission) throw createError({ statusCode: 404, statusMessage: 'Ruxsat topilmadi' })
  const key = { userId_permissionId: { userId, permissionId: permission.id } }
  const existing = await prisma.userPermission.findUnique({ where: key })
  if (!user.isSuperAdmin && existing?.canGrant) {
    throw createError({ statusCode: 403, statusMessage: 'Bu xodimning ruxsatini faqat super admin o‘zgartiradi' })
  }
  if (enabled) {
    await prisma.userPermission.upsert({
      where: key,
      create: { userId, permissionId: permission.id, canGrant: user.isSuperAdmin && canGrant, grantedById: user.id },
      update: { canGrant: user.isSuperAdmin ? canGrant : existing?.canGrant ?? false, grantedById: user.id }
    })
  } else if (existing) {
    await prisma.userPermission.delete({ where: key })
  }
  await audit(event, user, enabled ? 'GRANT' : 'REVOKE', 'permission', userId, `${target.username}: ${code} ${enabled ? 'berildi' : 'olib tashlandi'}`)
  return { ok: true }
})
