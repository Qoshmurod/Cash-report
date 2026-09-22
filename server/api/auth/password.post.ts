import { prisma } from '../../utils/prisma'
import { hashPassword, passwordFingerprint, requireAuth, verifyPassword } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const current = String(body?.currentPassword || '')
  const next = String(body?.newPassword || '')
  const record = await prisma.user.findUnique({ where: { id: user.id } })
  if (!record || !await verifyPassword(current, record.passwordHash)) {
    throw createError({ statusCode: 400, statusMessage: 'Joriy parol noto‘g‘ri' })
  }
  const fingerprint = passwordFingerprint(next)
  const duplicate = await prisma.user.findUnique({ where: { passwordFingerprint: fingerprint }, select: { id: true } })
  if (duplicate && duplicate.id !== user.id) throw createError({ statusCode: 409, statusMessage: 'Bu parol boshqa foydalanuvchida ishlatilgan' })
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), passwordFingerprint: fingerprint, mustChangePassword: false }
  })
  return { ok: true }
})
