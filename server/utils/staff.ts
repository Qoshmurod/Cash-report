import type { H3Event } from 'h3'
import { prisma } from './prisma'
import type { AuthUser } from './auth'

export const USERNAME_RE = /^[a-z0-9._-]{3,64}$/

export function optionalText(value: unknown, max = 120) {
  const text = String(value ?? '').trim()
  return text ? text.slice(0, max) : null
}

// Loads a staff account the actor may manage. Super admin accounts are managed only by super admin.
export async function loadManagedUser(event: H3Event, actor: AuthUser) {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Noto‘g‘ri xodim ID' })
  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'Xodim topilmadi' })
  if (target.role !== 'OPERATOR' && !actor.isSuperAdmin) throw createError({ statusCode: 403, statusMessage: 'Ruxsat yetarli emas' })
  return target
}

export async function optionalForeignId(value: unknown, model: 'role' | 'doctor') {
  if (value === null || value === undefined || value === '') return null
  const id = Number(value)
  const found = Number.isInteger(id) && (model === 'role'
    ? await prisma.role.findUnique({ where: { id }, select: { id: true } })
    : await prisma.doctor.findUnique({ where: { id }, select: { id: true } }))
  if (!found) throw createError({ statusCode: 400, statusMessage: model === 'role' ? 'Rol topilmadi' : 'Shifokor topilmadi' })
  return id
}
