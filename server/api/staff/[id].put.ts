import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { loadManagedUser, optionalForeignId, optionalText, USERNAME_RE } from '../../utils/staff'

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'STAFF_MANAGE')
  const target = await loadManagedUser(event, actor)
  const body = await readBody(event)
  const data: Record<string, unknown> = {
    fullName: optionalText(body?.fullName), phone: optionalText(body?.phone, 40), position: optionalText(body?.position)
  }
  if (body?.username !== undefined) {
    const username = String(body.username).trim().toLowerCase()
    if (!USERNAME_RE.test(username)) throw createError({ statusCode: 400, statusMessage: 'Login noto‘g‘ri' })
    data.username = username
  }
  // Role and doctor binding change effective access, so only super admin sets them.
  if (actor.isSuperAdmin) {
    if (body?.roleId !== undefined) data.roleId = await optionalForeignId(body.roleId, 'role')
    if (body?.doctorId !== undefined) data.doctorId = await optionalForeignId(body.doctorId, 'doctor')
  }
  try {
    const user = await prisma.user.update({ where: { id: target.id }, data, select: { id: true, username: true } })
    await audit(event, actor, 'UPDATE', 'staff', target.id, `Xodim tahrirlandi: ${target.username}`, data)
    return { user }
  } catch (error: any) {
    if (error?.code === 'P2002') throw createError({ statusCode: 409, statusMessage: 'Bu login yoki shifokor allaqachon biriktirilgan' })
    throw error
  }
})
