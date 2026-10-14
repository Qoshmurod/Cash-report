import { prisma } from '../../utils/prisma'
import { createSession, verifyPassword } from '../../utils/auth'
import { recordLogin } from '../../utils/audit'

const attempts = new Map<string, { count: number; resetAt: number }>()

function pruneAttempts() {
  const now = Date.now()
  for (const [key, value] of attempts) if (value.resetAt <= now) attempts.delete(key)
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const username = String(body?.username || '').trim().toLowerCase()
  const password = String(body?.password || '')
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const key = `${ip}:${username}`
  if (attempts.size > 500) pruneAttempts()
  const current = attempts.get(key)
  if (current && current.resetAt > Date.now() && current.count >= 5) {
    throw createError({ statusCode: 429, statusMessage: 'Juda ko‘p urinish. Keyinroq qayta urinib ko‘ring' })
  }
  const user = await prisma.user.findUnique({ where: { username } })
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'
  const valid = user && !user.disabled && await verifyPassword(password, user.passwordHash)
  if (!valid) {
    const next = current && current.resetAt > Date.now() ? current : { count: 0, resetAt: Date.now() + 15 * 60 * 1000 }
    next.count++
    attempts.set(key, next)
    if (username) await recordLogin(event, { id: user?.id ?? null, username, isSuperAdmin }, 'FAILED')
    throw createError({ statusCode: 401, statusMessage: 'Login yoki parol noto‘g‘ri' })
  }
  attempts.delete(key)
  await createSession(event, user)
  if (!isSuperAdmin) await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await recordLogin(event, { id: user.id, username: user.username, isSuperAdmin }, 'LOGIN')
  return { user: { id: user.id, username: user.username, mustChangePassword: user.mustChangePassword } }
})
