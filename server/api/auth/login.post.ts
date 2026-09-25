import { prisma } from '../../utils/prisma'
import { createSession, verifyPassword } from '../../utils/auth'

const attempts = new Map<string, { count: number; resetAt: number }>()

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const username = String(body?.username || '').trim().toLowerCase()
  const password = String(body?.password || '')
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const key = `${ip}:${username}`
  const current = attempts.get(key)
  if (current && current.resetAt > Date.now() && current.count >= 5) {
    throw createError({ statusCode: 429, statusMessage: 'Juda ko‘p urinish. Keyinroq qayta urinib ko‘ring' })
  }
  const user = await prisma.user.findUnique({ where: { username } })
  const valid = user && !user.disabled && await verifyPassword(password, user.passwordHash)
  if (!valid) {
    await prisma.loginHistory.create({
      data: {
        userId: user?.id,
        username,
        role: user?.role,
        ipAddress: ip,
        userAgent: getHeader(event, 'user-agent') || null,
        success: false
      }
    })
    const next = current && current.resetAt > Date.now() ? current : { count: 0, resetAt: Date.now() + 15 * 60 * 1000 }
    next.count++
    attempts.set(key, next)
    throw createError({ statusCode: 401, statusMessage: 'Login yoki parol noto‘g‘ri' })
  }
  attempts.delete(key)
  await createSession(event, user)
  return { user: { id: user.id, username: user.username, role: user.role, mustChangePassword: user.mustChangePassword } }
})
