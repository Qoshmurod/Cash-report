import { prisma } from '../../utils/prisma'
import { requireAnyPermission } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAnyPermission(event, ['GUARANTEE_LETTERS_VIEW', 'GUARANTEE_LETTERS_UPLOAD'])
  return {
    letters: await prisma.guaranteeLetter.findMany({
      select: { id: true, title: true, kind: true, note: true, fileName: true, createdAt: true, contract: { select: { id: true, number: true, organization: true } } },
      orderBy: { createdAt: 'desc' }
    })
  }
})
