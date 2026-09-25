import * as XLSX from 'xlsx'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event, ['SUPER_ADMIN'])
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.json_to_sheet([{ IsmFamiliya: '', Telefon: '', TugilganYili: '', Manzil: '' }])
  XLSX.utils.book_append_sheet(workbook, sheet, 'Bemorlar')
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  setHeader(event, 'content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'content-disposition', 'attachment; filename="bemorlar-template.xlsx"')
  return buffer
})
