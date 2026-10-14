import { prisma } from '../../utils/prisma'
import { requireSuperAdmin } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = await readBody(event)
  const clean = (value: unknown) => String(value || '').trim().slice(0, 120)
  const value = { enabled: body?.enabled !== false, telegram: clean(body?.telegram), instagram: clean(body?.instagram), phone: clean(body?.phone), text: clean(body?.text) }
  await prisma.setting.upsert({ where: { key: 'contact' }, create: { key: 'contact', value }, update: { value } })
  return { contact: value }
})
