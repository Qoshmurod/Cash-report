import * as XLSX from 'xlsx'
import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'REPORTS_EXPORT')
  const query = getQuery(event)
  const department = String(query.department || '').trim()
  const method = String(query.method || '').trim()
  const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : undefined
  const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined
  if (from && Number.isNaN(from.getTime()) || to && Number.isNaN(to.getTime())) {
    throw createError({ statusCode: 400, statusMessage: 'Sana oralig‘i noto‘g‘ri' })
  }
  const payments = await prisma.payment.findMany({
    where: {
      deletedAt: null,
      createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) },
      ...(department ? { department } : {}),
      ...(method && ['CASH', 'CARD', 'TRANSFER'].includes(method) ? { method: method as 'CASH' | 'CARD' | 'TRANSFER' } : {}),
      ...(user.doctorId ? { doctorId: user.doctorId } : {})
    },
    include: { patient: true, doctor: true, cashier: { select: { username: true } }, paymentServices: { include: { service: true } } },
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
    'Xizmatlar': p.paymentServices.map((selection) => selection.service.name).join('; '),
    'To‘lov usuli': p.method,
    Kassir: p.cashier?.username || '',
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
  const daily = new Map<string, { count: number; amount: number }>()
  for (const payment of payments) {
    const day = payment.createdAt.toISOString().slice(0, 10)
    const current = daily.get(day) || { count: 0, amount: 0 }
    current.count++
    current.amount += payment.amount
    daily.set(day, current)
  }
  rows.push({ ID: '', Sana: 'KUNLIK JAMI', Bemor: '', Telefon: '', Shifokor: '', 'Bo‘lim': '', 'Xizmat': '', 'Xizmatlar': '', 'To‘lov usuli': '', Kassir: '', Summa: '', Izoh: '' })
  for (const [day, total] of daily) rows.push({ ID: '', Sana: day, Bemor: `${total.count} ta`, Telefon: '', Shifokor: '', 'Bo‘lim': '', 'Xizmat': '', 'Xizmatlar': '', 'To‘lov usuli': '', Kassir: '', Summa: total.amount, Izoh: '' })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Cash report')
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  setHeader(event, 'content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'content-disposition', 'attachment; filename="cash-report.xlsx"')
  return buffer
})
