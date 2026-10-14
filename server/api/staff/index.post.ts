import { prisma } from '../../utils/prisma'
import { hashPassword, passwordFingerprint, requireSuperAdmin } from '../../utils/auth'
import { optionalForeignId, optionalText, USERNAME_RE } from '../../utils/staff'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = await readBody(event)
  const username = String(body?.username || '').trim().toLowerCase()
  const password = String(body?.password || '')
  if (!USERNAME_RE.test(username)) throw createError({ statusCode: 400, statusMessage: 'Login 3-64 ta lotin harfi, raqam yoki ._- dan iborat bo‘lsin' })
  const passwordHash = await hashPassword(password)
  try {
    const user = await prisma.user.create({
      data: {
        username, passwordHash, passwordFingerprint: passwordFingerprint(password), role: 'OPERATOR', mustChangePassword: true,
        fullName: optionalText(body?.fullName), phone: optionalText(body?.phone, 40), position: optionalText(body?.position),
        roleId: await optionalForeignId(body?.roleId, 'role'), doctorId: await optionalForeignId(body?.doctorId, 'doctor')
      },
      select: { id: true, username: true }
    })
    return { user }
  } catch (error: any) {
    if (error?.code === 'P2002') throw createError({ statusCode: 409, statusMessage: 'Bu login yoki shifokor allaqachon biriktirilgan' })
    throw error
  }
})
