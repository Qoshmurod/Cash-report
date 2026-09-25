import * as XLSX from 'xlsx'
import { prisma } from '../../utils/prisma'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event, ['SUPER_ADMIN'])
  const query = getQuery(event)
  const action = String(query.action || '')
  const contentType = getHeader(event, 'content-type') || ''
  let sourceRows: unknown[] = []

  if (contentType.includes('multipart/form-data')) {
    const parts = await readMultipartFormData(event)
    const file = parts?.find((part) => part.name === 'file' && part.data)
    if (!file?.data) throw createError({ statusCode: 400, statusMessage: 'Excel fayl tanlanmagan' })
    try {
      const workbook = XLSX.read(file.data, { type: 'buffer', cellDates: true })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      if (!firstSheet) throw new Error('Sheet topilmadi')
      sourceRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
    } catch {
      throw createError({ statusCode: 400, statusMessage: 'Excel faylni o‘qib bo‘lmadi' })
    }
  } else {
    const body = await readBody(event)
    sourceRows = Array.isArray(body?.patients) ? body.patients : []
  }

  if (!sourceRows.length) {
    throw createError({ statusCode: 400, statusMessage: 'Excel jadvali bo‘sh yoki bemorlar ro‘yxati berilmagan' })
  }

  const existing = await prisma.patient.findMany({ select: { fullName: true, phone: true, birthYear: true } })
  const keyFor = (fullName: string, phone: string | null, birthYear: number | null) =>
    `${fullName.trim().toLocaleLowerCase()}|${phone?.trim() || ''}|${birthYear ?? ''}`
  const known = new Set(existing.map((item) => keyFor(item.fullName, item.phone, item.birthYear)))
  const seen = new Set<string>()
  const rows: Array<{ fullName: string; phone: string | null; birthYear: number | null; address: string | null }> = []
  const errors: Array<{ row: number; message: string }> = []
  let skipped = 0

  for (const raw of sourceRows) {
    const item = raw as Record<string, unknown>
    const value = (keys: string[]) => {
      const entry = Object.entries(item).find(([key]) => {
        const normalized = key.trim().toLocaleLowerCase()
        return keys.some((candidate) => normalized.includes(candidate))
      })
      return entry?.[1]
    }
    const fullName = String(value(['ism', 'fam', 'name', 'fio', 'full_name']) || '').trim()
    if (!fullName) {
      skipped++
      errors.push({ row: rows.length + skipped, message: 'Ism-familiya topilmadi' })
      continue
    }
    const phoneValue = value(['tel', 'phone', 'telefon'])
    const phone = phoneValue ? String(phoneValue).trim() : null
    const yearValue = value(['yil', 'year', 'birth'])
    const parsedYear = Number(yearValue)
    const birthYear = Number.isInteger(parsedYear) && parsedYear >= 1900 && parsedYear <= new Date().getFullYear() ? parsedYear : null
    const key = keyFor(fullName, phone, birthYear)
    if (known.has(key) || seen.has(key)) {
      skipped++
      continue
    }
    rows.push({
      fullName,
      phone,
      birthYear,
      address: value(['manzil', 'address', 'adres']) ? String(value(['manzil', 'address', 'adres'])).trim() : null
    })
    seen.add(key)
  }

  if (action === 'preview') {
    return { preview: rows.slice(0, 100), valid: rows.length, skipped, errors, total: sourceRows.length, requiresConfirmation: true }
  }
  if (rows.length) await prisma.patient.createMany({ data: rows })
  return { added: rows.length, skipped, errors, total: sourceRows.length, confirmed: action === 'confirm' }
})
