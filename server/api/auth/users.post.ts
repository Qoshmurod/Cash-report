import { prisma } from '../../utils/prisma'
import { hashPassword, passwordFingerprint, requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event, ['SUPER_ADMIN'])
  const body = await readBody(event)
  const username = String(body?.username || '').trim().toLowerCase()
  const password = String(body?.password || '')
  const role = body?.role === 'ADMIN' ? 'ADMIN' : 'OPERATOR'
  if (!/^[a-z0-9._-]{3,64}$/.test(username)) throw createError({ statusCode: 400, statusMessage: 'Login noto‘g‘ri' })
  const passwordHash = await hashPassword(password)
  try {
    const user = await prisma.user.create({
      data: { username, passwordHash, passwordFingerprint: passwordFingerprint(password), role, mustChangePassword: true },
      select: { id: true, username: true, role: true, mustChangePassword: true }
    })
    return { user }
  } catch (error: any) {
    if (error?.code === 'P2002') throw createError({ statusCode: 409, statusMessage: 'Bu login allaqachon ishlatilgan' })
    throw error
  }
})
