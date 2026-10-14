import { prisma } from '../../../utils/prisma'
import { requireAnyPermission } from '../../../utils/auth'
import { sendFile } from '../../../utils/files'
import { routeId } from '../../../utils/catalog-items'

export default defineEventHandler(async (event) => {
  await requireAnyPermission(event, ['CONTRACTS_VIEW', 'CONTRACTS_MANAGE'])
  const contract = await prisma.contract.findUnique({ where: { id: routeId(event) }, select: { fileName: true, fileMime: true, fileData: true } })
  if (!contract?.fileData || !contract.fileName) throw createError({ statusCode: 404, statusMessage: 'Shartnoma fayli yo‘q' })
  return sendFile(event, { fileName: contract.fileName, fileMime: contract.fileMime || '', data: contract.fileData })
})
