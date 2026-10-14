import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { attachClients, extractClients, readTableRows, readUpload } from '../../utils/files'
import { parseContractFields } from '../../utils/contracts'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'CONTRACTS_MANAGE')
  const { fields, files } = await readUpload(event)
  const data = parseContractFields(fields)
  if (!files.clients) throw createError({ statusCode: 400, statusMessage: 'Shartnoma bo‘yicha mijozlar ro‘yxati (Excel yoki Word) yuklanishi shart' })
  const { clients, skipped } = extractClients(await readTableRows(files.clients))
  if (!clients.length) throw createError({ statusCode: 400, statusMessage: 'Ro‘yxatda mijoz topilmadi' })
  const contract = await prisma.contract.create({
    data: {
      ...data,
      fileName: files.contract?.filename || null,
      fileMime: files.contract?.type || null,
      fileData: files.contract?.data || null,
      clientsFileName: files.clients.filename,
      createdById: user.id
    },
    select: { id: true, number: true, organization: true }
  })
  const result = await attachClients(contract.id, clients)
  await audit(event, user, 'CREATE', 'contract', contract.id, `Shartnoma yuklandi: №${contract.number} (${contract.organization}), mijozlar: ${result.total}`)
  return { contract, import: { ...result, skipped } }
})
