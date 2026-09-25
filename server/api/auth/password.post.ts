import { prisma } from '../../utils/prisma'
import { hashPassword, passwordFingerprint, requireAuth, verifyPassword } from '../../utils/auth'
import { recordAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const current = String(body?.currentPassword || '')
  const next = String(body?.newPassword || '')
  const record = await prisma.user.findUnique({ where: { id: user.id } })
  if (!record || !await verifyPassword(current, record.passwordHash)) {
    throw createError({ statusCode: 400, statusMessage: 'Joriy parol noto‘g‘ri' })
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), passwordFingerprint: passwordFingerprint(next), mustChangePassword: false }
  })
  await recordAudit(event, user, { action: 'CHANGE_PASSWORD', entity: 'User', entityId: user.id })
  return { ok: true }
})
