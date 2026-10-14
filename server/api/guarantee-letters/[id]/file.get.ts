import { prisma } from '../../../utils/prisma'
import { requireAnyPermission } from '../../../utils/auth'
import { sendFile } from '../../../utils/files'
import { routeId } from '../../../utils/catalog-items'

export default defineEventHandler(async (event) => {
  await requireAnyPermission(event, ['GUARANTEE_LETTERS_VIEW', 'GUARANTEE_LETTERS_UPLOAD'])
  const letter = await prisma.guaranteeLetter.findUnique({ where: { id: routeId(event) }, select: { fileName: true, fileMime: true, fileData: true } })
  if (!letter) throw createError({ statusCode: 404, statusMessage: 'Fayl topilmadi' })
  return sendFile(event, { fileName: letter.fileName, fileMime: letter.fileMime, data: letter.fileData })
})
