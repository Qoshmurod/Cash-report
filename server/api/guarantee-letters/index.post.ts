import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { readUpload } from '../../utils/files'

// Only super admin or a user granted GUARANTEE_LETTERS_UPLOAD (directly, by role, or by a delegate) may upload.
export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'GUARANTEE_LETTERS_UPLOAD')
  const { fields, files } = await readUpload(event)
  if (!files.file) throw createError({ statusCode: 400, statusMessage: 'Kafolat xati fayli tanlanmagan' })
  const title = String(fields.title || files.file.filename).trim().slice(0, 200)
  const contractId = fields.contractId ? Number(fields.contractId) : null
  if (contractId !== null && !(Number.isInteger(contractId) && await prisma.contract.findUnique({ where: { id: contractId }, select: { id: true } }))) {
    throw createError({ statusCode: 400, statusMessage: 'Shartnoma topilmadi' })
  }
  const letter = await prisma.guaranteeLetter.create({
    data: {
      title,
      kind: fields.kind === 'TEMPLATE' ? 'TEMPLATE' : 'LETTER',
      contractId,
      note: fields.note ? fields.note.trim().slice(0, 500) : null,
      fileName: files.file.filename,
      fileMime: files.file.type,
      fileData: files.file.data,
      createdById: user.id
    },
    select: { id: true, title: true, kind: true }
  })
  await audit(event, user, 'UPLOAD', 'guarantee-letter', letter.id, `Kafolat xati yuklandi: ${letter.title}`)
  return { letter }
})
