import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  const setting = await prisma.setting.findUnique({ where: { key: 'contact' } })
  return { contact: (setting?.value as Record<string, string> | null) || {} }
})
