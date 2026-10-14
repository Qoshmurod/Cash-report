import { prisma } from '../../utils/prisma'
import { requireSuperAdmin } from '../../utils/auth'
import { parseRoleBody, permissionIds, roleInclude, serializeRole } from '../../utils/roles'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const { name, description, codes, departments } = parseRoleBody(await readBody(event))
  try {
    const role = await prisma.role.create({
      data: { name, description, departments, permissions: { create: await permissionIds(codes) } },
      include: roleInclude
    })
    return { role: serializeRole(role) }
  } catch (error: any) {
    if (error?.code === 'P2002') throw createError({ statusCode: 409, statusMessage: 'Bu nomli rol mavjud' })
    throw error
  }
})
