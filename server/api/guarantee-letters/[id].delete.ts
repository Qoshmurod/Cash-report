import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { routeId } from '../../utils/catalog-items'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'GUARANTEE_LETTERS_UPLOAD')
  const id = routeId(event)
  const letter = await prisma.guaranteeLetter.delete({ where: { id }, select: { title: true } })
    .catch(() => { throw createError({ statusCode: 404, statusMessage: 'Fayl topilmadi' }) })
  await audit(event, user, 'DELETE', 'guarantee-letter', id, `Kafolat xati o‘chirildi: ${letter.title}`)
  return { ok: true }
})
