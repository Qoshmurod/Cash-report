import * as XLSX from 'xlsx'
import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'REPORTS_EXPORT')
  const query = getQuery(event)
  const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : undefined
  const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined
  if (from && Number.isNaN(from.getTime()) || to && Number.isNaN(to.getTime())) {
    throw createError({ statusCode: 400, statusMessage: 'Sana oralig‘i noto‘g‘ri' })
  }
  const payments = await prisma.payment.findMany({
    where: { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }, ...(user.doctorId ? { doctorId: user.doctorId } : {}) },
    include: { patient: true, doctor: true },
    orderBy: { createdAt: 'asc' }
  })
  const rows: Record<string, string | number>[] = payments.map((p) => ({
    ID: p.id,
    Sana: p.createdAt.toISOString(),
    Bemor: p.patient.fullName,
    Telefon: p.patient.phone || '',
    Shifokor: p.doctor?.fullName || '',
    'Bo‘lim': p.department,
    'Xizmat': p.service || '',
    Summa: p.amount,
    'Izoh': p.note || ''
  }))
  rows.push({
    ID: '',
    Sana: '',
    Bemor: '',
    Telefon: '',
    'Bo‘lim': '',
    'Xizmat': 'JAMI',
    Summa: payments.reduce((sum, p) => sum + p.amount, 0),
    'Izoh': ''
  })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Cash report')
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  setHeader(event, 'content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'content-disposition', 'attachment; filename="cash-report.xlsx"')
  return buffer
})
