import { prisma } from '../../../../utils/prisma'
import { requirePermission } from '../../../../utils/auth'
import { audit } from '../../../../utils/audit'
import { attachClients, extractClients, readTableRows, readUpload } from '../../../../utils/files'
import { routeId } from '../../../../utils/catalog-items'

// Adds more clients (or a replacement contract file) to an existing contract.
export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'CONTRACTS_MANAGE')
  const id = routeId(event)
  const contract = await prisma.contract.findUnique({ where: { id }, select: { id: true, number: true } })
  if (!contract) throw createError({ statusCode: 404, statusMessage: 'Shartnoma topilmadi' })
  const { files } = await readUpload(event)
  if (files.contract) {
    await prisma.contract.update({ where: { id }, data: { fileName: files.contract.filename, fileMime: files.contract.type, fileData: files.contract.data } })
  }
  if (!files.clients) return { import: null }
  const { clients, skipped } = extractClients(await readTableRows(files.clients))
  const result = await attachClients(id, clients)
  await prisma.contract.update({ where: { id }, data: { clientsFileName: files.clients.filename } })
  await audit(event, user, 'IMPORT', 'contract', id, `Shartnoma №${contract.number} ga mijozlar qo‘shildi: ${result.total}`)
  return { import: { ...result, skipped } }
})
