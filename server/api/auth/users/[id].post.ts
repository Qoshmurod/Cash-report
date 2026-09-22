import { prisma } from '../../../utils/prisma'
import { hashPassword, passwordFingerprint, requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event, ['SUPER_ADMIN'])
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const password = String(body?.password || '')
  if (!Number.isInteger(id) || !password) throw createError({ statusCode: 400, statusMessage: 'Ma’lumot noto‘g‘ri' })
  const updated = await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password), passwordFingerprint: passwordFingerprint(password), mustChangePassword: true },
    select: { id: true, username: true, mustChangePassword: true }
  })
  await prisma.session.deleteMany({ where: { userId: id } })
  return { user: updated }
})
