import { prisma } from '../../utils/prisma'
import { requireSuperAdmin } from '../../utils/auth'
import { parseRoleBody, permissionIds, roleInclude, serializeRole } from '../../utils/roles'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) throw createError({ statusCode: 400, statusMessage: 'Noto‘g‘ri rol ID' })
  const { name, description, codes, departments } = parseRoleBody(await readBody(event))
  try {
    const role = await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } })
      return tx.role.update({
        where: { id },
        data: { name, description, departments, permissions: { create: await permissionIds(codes) } },
        include: roleInclude
      })
    })
    return { role: serializeRole(role) }
  } catch (error: any) {
    if (error?.code === 'P2002') throw createError({ statusCode: 409, statusMessage: 'Bu nomli rol mavjud' })
    if (error?.code === 'P2025') throw createError({ statusCode: 404, statusMessage: 'Rol topilmadi' })
    throw error
  }
})
