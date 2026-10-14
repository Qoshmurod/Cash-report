import { PAYMENT_METHODS } from './catalog'
import { localDateTimeString } from './dates'
import { loadXlsx } from './lazy'

const methodLabel = (value: string) => PAYMENT_METHODS.find((item) => item.value === value)?.label || value

export async function paymentsWorkbook(payments: any[], title = 'Cash report') {
  const XLSX = loadXlsx()
  const rows: Record<string, string | number>[] = payments.map((p) => ({
    ID: p.id,
    Sana: localDateTimeString(p.createdAt),
    Bemor: p.patient.fullName,
    Telefon: p.patient.phone || '',
    Shifokor: p.doctor?.fullName || '',
    'Bo‘lim': p.department,
    Xizmat: [...(p.paymentServices || []).map((item: any) => item.service.name), p.service].filter(Boolean).join(', '),
    'To‘lov turi': methodLabel(p.method),
    Shartnoma: p.contract ? `№${p.contract.number} ${p.contract.organization}` : '',
    Summa: p.amount,
    Kassir: p.createdBy?.fullName || p.createdBy?.username || '',
    Izoh: [p.note, p.editReason ? `Tahrir: ${p.editReason}` : ''].filter(Boolean).join('; ')
  }))
  for (const method of PAYMENT_METHODS) {
    const sum = payments.filter((p) => p.method === method.value).reduce((total, p) => total + p.amount, 0)
    if (sum) rows.push({ Xizmat: `Jami: ${method.label}`, Summa: sum })
  }
  rows.push({ Xizmat: 'JAMI', Summa: payments.reduce((sum, p) => sum + p.amount, 0) })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), title.slice(0, 31))
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export function sendWorkbook(event: any, buffer: Buffer, fileName: string) {
  setHeader(event, 'content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'content-disposition', `attachment; filename="${fileName}"`)
  return buffer
}
