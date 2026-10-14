import { prisma } from './prisma'
import { DEPARTMENT_CODES, PERMISSION_CODES } from './catalog'

export function parseRoleBody(body: any) {
  const name = String(body?.name || '').trim()
  if (!name || name.length > 80) throw createError({ statusCode: 400, statusMessage: 'Rol nomi shart' })
  const codes: string[] = Array.isArray(body?.permissions) ? [...new Set(body.permissions.map(String))].filter((code: any) => PERMISSION_CODES.has(code)) as string[] : []
  const departments: string[] = Array.isArray(body?.departments) ? [...new Set(body.departments.map(String))].filter((code: any) => DEPARTMENT_CODES.includes(code)) as string[] : []
  return { name, description: body?.description ? String(body.description).trim() : null, codes, departments }
}

export async function permissionIds(codes: string[]) {
  const rows = await prisma.permission.findMany({ where: { code: { in: codes } }, select: { id: true } })
  return rows.map((row) => ({ permissionId: row.id }))
}

export const roleInclude = { permissions: { include: { permission: true } }, _count: { select: { users: true } } } as const

export function serializeRole(role: any) {
  return { id: role.id, name: role.name, description: role.description, departments: role.departments, permissions: role.permissions.map((item: any) => item.permission.code), userCount: role._count?.users ?? 0 }
}
