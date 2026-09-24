import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'DATABASE_DATA_ADD')
  const body = await readBody(event)
  const code = String(body?.code || '').trim().toUpperCase()
  const name = String(body?.name || '').trim()
  if (!/^[A-Z0-9_]{2,64}$/.test(code) || !name) {
    throw createError({ statusCode: 400, statusMessage: 'Bo‘lim kodi va nomi noto‘g‘ri' })
  }
  return { department: await prisma.department.create({ data: { code, name } }) }
})
