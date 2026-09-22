import { prisma } from '../../utils/prisma'
import { createSession, hashPassword, passwordFingerprint, requireAuth, verifyPassword } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const currentPassword = String(body?.currentPassword || '')
  const nextUsername = String(body?.username || '').trim().toLowerCase()
  const nextPassword = String(body?.newPassword || '')
  const record = await prisma.user.findUnique({ where: { id: user.id } })

  if (!record || !await verifyPassword(currentPassword, record.passwordHash)) {
    throw createError({ statusCode: 400, statusMessage: 'Joriy parol noto‘g‘ri' })
  }
  if (!/^[a-z0-9._-]{3,64}$/.test(nextUsername)) {
    throw createError({ statusCode: 400, statusMessage: 'Login 3-64 ta lotin harfi, raqam yoki ._- dan iborat bo‘lsin' })
  }
  if (nextPassword.length < 12) {
    throw createError({ statusCode: 400, statusMessage: 'Yangi parol kamida 12 belgidan iborat bo‘lsin' })
  }

  const duplicateUsername = await prisma.user.findFirst({
    where: { username: nextUsername, NOT: { id: user.id } },
    select: { id: true }
  })
  if (duplicateUsername) throw createError({ statusCode: 409, statusMessage: 'Bu login allaqachon ishlatilgan' })

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      username: nextUsername,
      passwordHash: await hashPassword(nextPassword),
      passwordFingerprint: passwordFingerprint(nextPassword),
      mustChangePassword: false
    }
  })
  await prisma.session.deleteMany({ where: { userId: user.id } })
  await createSession(event, {
    id: updated.id,
    username: updated.username,
    role: updated.role,
    mustChangePassword: updated.mustChangePassword
  })
  return { ok: true, username: nextUsername }
})
