import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  const setting = await prisma.setting.findUnique({ where: { key: 'contact' } })
  const contact = (setting?.value as Record<string, any> | null) || {}
  return { contact: { ...contact, enabled: contact.enabled !== false } }
})
