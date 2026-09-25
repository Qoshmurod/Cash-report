import { prisma } from '../../utils/prisma'
import { hashPassword, passwordFingerprint } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'x-bootstrap-token')
  if (!process.env.BOOTSTRAP_ADMIN_TOKEN || token !== process.env.BOOTSTRAP_ADMIN_TOKEN) {
    throw createError({ statusCode: 403, statusMessage: 'Bootstrap token noto‘g‘ri' })
  }
  if (await prisma.user.count() > 0) throw createError({ statusCode: 409, statusMessage: 'Bootstrap allaqachon bajarilgan' })
  const body = await readBody(event)
  const configuredUsername = String(process.env.BOOTSTRAP_ADMIN_USERNAME || '').trim().toLowerCase()
  const configuredPassword = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '')
  const username = String(body?.username ?? configuredUsername).trim().toLowerCase()
  const password = String(body?.password ?? configuredPassword)
  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Bootstrap uchun username va parol kerak' })
  }
  if (!/^[a-z0-9._-]{3,64}$/.test(username)) throw createError({ statusCode: 400, statusMessage: 'Login noto‘g‘ri' })
  const passwordHash = await hashPassword(password)
  await prisma.user.create({
    data: { username, passwordHash, passwordFingerprint: passwordFingerprint(password), role: 'SUPER_ADMIN' }
  })
  return { ok: true, user: { username, role: 'SUPER_ADMIN' } }
})
