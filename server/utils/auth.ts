import {
  createHash,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual
} from 'node:crypto'
import { promisify } from 'node:util'
import type { H3Event } from 'h3'
import { prisma } from './prisma'
import { DEPARTMENT_CODES, PERMISSIONS } from './catalog'

const scrypt = promisify(nodeScrypt)
const SESSION_COOKIE = 'cash_session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000

export type AuthUser = {
  id: number
  username: string
  fullName: string | null
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR'
  isSuperAdmin: boolean
  roleId: number | null
  roleName: string | null
  mustChangePassword: boolean
  doctorId: number | null
  permissions: string[]
  grantable: string[]
  departments: string[]
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

export async function createSession(event: H3Event, user: { id: number }) {
  const id = randomBytes(32).toString('base64url')
  await prisma.session.create({
    data: { id, userId: user.id, expiresAt: new Date(Date.now() + SESSION_TTL_MS) }
  })
  setCookie(event, SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(),
    maxAge: SESSION_TTL_MS / 1000,
    path: '/'
  })
}

// Set COOKIE_SECURE=false only when the server is reached over plain HTTP (no TLS proxy).
function cookieSecure() {
  if (process.env.COOKIE_SECURE) return process.env.COOKIE_SECURE !== 'false'
  return process.env.NODE_ENV === 'production'
}

async function loadAuthUser(event: H3Event): Promise<AuthUser | null> {
  const id = getCookie(event, SESSION_COOKIE)
  if (!id) return null
  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      user: {
        include: {
          customRole: { include: { permissions: { include: { permission: true } } } },
          permissions: { include: { permission: true } }
        }
      }
    }
  })
  if (!session || session.expiresAt <= new Date() || session.user.disabled) return null
  const record = session.user
  const isSuperAdmin = record.role === 'SUPER_ADMIN' || record.role === 'ADMIN'
  const permissions = isSuperAdmin
    ? PERMISSIONS.map((item) => item.code)
    : [...new Set([
        ...(record.customRole?.permissions.map((item) => item.permission.code) || []),
        ...record.permissions.map((item) => item.permission.code)
      ])]
  return {
    id: record.id,
    username: record.username,
    fullName: record.fullName,
    role: record.role,
    isSuperAdmin,
    roleId: record.roleId,
    roleName: isSuperAdmin ? 'Super admin' : record.customRole?.name || null,
    mustChangePassword: record.mustChangePassword,
    doctorId: record.doctorId,
    permissions,
    grantable: isSuperAdmin ? PERMISSIONS.map((item) => item.code) : record.permissions.filter((item) => item.canGrant).map((item) => item.permission.code),
    departments: isSuperAdmin ? [...DEPARTMENT_CODES] : record.customRole?.departments.filter((code) => DEPARTMENT_CODES.includes(code)) || []
  }
}

export async function getAuthUser(event: H3Event): Promise<AuthUser | null> {
  if (event.context.authUserLoaded) return event.context.authUser ?? null
  const user = await loadAuthUser(event)
  event.context.authUser = user
  event.context.authUserLoaded = true
  return user
}

export async function requireAuth(event: H3Event) {
  const user = await getAuthUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Autentifikatsiya talab qilinadi' })
  return user
}

export async function requireSuperAdmin(event: H3Event) {
  const user = await requireAuth(event)
  if (!user.isSuperAdmin) throw createError({ statusCode: 403, statusMessage: 'Bu amal faqat super admin uchun' })
  return user
}

export function hasPermission(user: AuthUser, permission: string) {
  return user.isSuperAdmin || user.permissions.includes(permission)
}

export async function requirePermission(event: H3Event, permission: string) {
  return requireAnyPermission(event, [permission])
}

export async function requireAnyPermission(event: H3Event, permissions: string[]) {
  const user = await requireAuth(event)
  if (!permissions.some((permission) => hasPermission(user, permission))) {
    throw createError({ statusCode: 403, statusMessage: 'Ruxsat yetarli emas' })
  }
  return user
}

export async function destroySession(event: H3Event) {
  const id = getCookie(event, SESSION_COOKIE)
  if (id) await prisma.session.delete({ where: { id } }).catch(() => {})
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}
