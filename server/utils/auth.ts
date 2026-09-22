import {
  createHash,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual
} from 'node:crypto'
import { promisify } from 'node:util'
import type { H3Event } from 'h3'
import { prisma } from './prisma'

const scrypt = promisify(nodeScrypt)
const SESSION_COOKIE = 'cash_session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000

export type AuthUser = {
  id: number
  username: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR'
  mustChangePassword: boolean
}

function secret() {
  const value = process.env.NUXT_SESSION_SECRET
  if (!value || value.length < 32) throw new Error('NUXT_SESSION_SECRET must be at least 32 characters')
  return value
}

export async function hashPassword(password: string) {
  if (password.length < 12) throw createError({ statusCode: 400, statusMessage: 'Parol kamida 12 belgidan iborat bo‘lsin' })
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, 64) as Buffer
  return `scrypt$${salt.toString('base64')}$${derived.toString('base64')}`
}

export async function verifyPassword(password: string, encoded: string) {
  const [, saltText, hashText] = encoded.split('$')
  if (!saltText || !hashText) return false
  const derived = await scrypt(password, Buffer.from(saltText, 'base64'), 64) as Buffer
  const expected = Buffer.from(hashText, 'base64')
  return expected.length === derived.length && timingSafeEqual(expected, derived)
}

// Salted password hashes cannot be compared safely. This keyed fingerprint detects
// reuse without exposing or storing a recoverable password.
export function passwordFingerprint(password: string) {
  return createHash('sha256').update(`${secret()}\0${password}`).digest('hex')
}

export async function createSession(event: H3Event, user: AuthUser) {
  const id = randomBytes(32).toString('base64url')
  await prisma.session.create({
    data: { id, userId: user.id, expiresAt: new Date(Date.now() + SESSION_TTL_MS) }
  })
  setCookie(event, SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS / 1000,
    path: '/'
  })
}

export async function getAuthUser(event: H3Event): Promise<AuthUser | null> {
  const id = getCookie(event, SESSION_COOKIE)
  if (!id) return null
  const session = await prisma.session.findUnique({ where: { id }, include: { user: true } })
  if (!session || session.expiresAt <= new Date() || session.user.disabled) return null
  return {
    id: session.user.id,
    username: session.user.username,
    role: session.user.role,
    mustChangePassword: session.user.mustChangePassword
  }
}

export async function requireAuth(event: H3Event, roles?: AuthUser['role'][]) {
  const user = await getAuthUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Autentifikatsiya talab qilinadi' })
  if (roles && !roles.includes(user.role)) throw createError({ statusCode: 403, statusMessage: 'Ruxsat yetarli emas' })
  return user
}

export async function requirePermission(event: H3Event, permission: string) {
  const user = await requireAuth(event)
  if (user.role === 'SUPER_ADMIN') return user
  const granted = await prisma.userPermission.findFirst({
    where: { userId: user.id, permission: { code: permission } }
  })
  if (!granted) throw createError({ statusCode: 403, statusMessage: 'Ruxsat yetarli emas' })
  return user
}

export function destroySession(event: H3Event) {
  const id = getCookie(event, SESSION_COOKIE)
  if (id) void prisma.session.delete({ where: { id } }).catch(() => {})
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}
