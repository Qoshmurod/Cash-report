import { prisma } from './prisma'
import { loadMammoth, loadXlsx } from './lazy'

export const MAX_FILE_BYTES = 15 * 1024 * 1024

export type UploadedFile = { filename: string; type: string; data: Uint8Array<ArrayBuffer> }

export async function readUpload(event: any) {
  const parts = await readMultipartFormData(event)
  if (!parts) throw createError({ statusCode: 400, statusMessage: 'Fayl yuborilmagan' })
  const fields: Record<string, string> = {}
  const files: Record<string, UploadedFile> = {}
  for (const part of parts) {
    if (!part.name) continue
    if (part.filename) {
      if (!part.data.length) continue
      if (part.data.length > MAX_FILE_BYTES) throw createError({ statusCode: 413, statusMessage: 'Fayl hajmi 15 MB dan oshmasin' })
      files[part.name] = { filename: part.filename.slice(0, 200), type: part.type || 'application/octet-stream', data: new Uint8Array(part.data) }
    } else {
      fields[part.name] = part.data.toString('utf8')
    }
  }
  return { fields, files }
}

export function sendFile(event: any, file: { fileName: string; fileMime: string; data: Uint8Array }) {
  setHeader(event, 'content-type', file.fileMime || 'application/octet-stream')
  setHeader(event, 'content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`)
  return Buffer.from(file.data)
}

function decodeEntities(text: string) {
  return text.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
}

// Reads the first table of an Excel/CSV file or every table of a .docx file as rows of cells.
export async function readTableRows(file: UploadedFile): Promise<string[][]> {
  const name = file.filename.toLowerCase()
  if (name.endsWith('.docx')) {
    const mammoth = loadMammoth()
    const { value: html } = await mammoth.convertToHtml({ buffer: Buffer.from(file.data) })
    const rows: string[][] = []
    for (const row of html.match(/<tr[\s\S]*?<\/tr>/g) || []) {
      rows.push((row.match(/<t[dh][\s\S]*?<\/t[dh]>/g) || []).map(decodeEntities))
    }
    if (!rows.length) throw createError({ statusCode: 400, statusMessage: 'Word faylda jadval topilmadi' })
    return rows
  }
  if (name.endsWith('.doc')) throw createError({ statusCode: 400, statusMessage: 'Eski .doc formati qo‘llanmaydi. Faylni .docx yoki Excel ko‘rinishida saqlang' })
  const XLSX = loadXlsx()
  try {
    const workbook = XLSX.read(file.data, { type: 'buffer', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]!]
    if (!sheet) throw new Error('empty')
    return (XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as unknown[][]).map((row) => row.map((cell) => String(cell ?? '').trim()))
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Jadval faylini o‘qib bo‘lmadi (xlsx, xls, csv yoki docx bo‘lsin)' })
  }
}

export type ClientRow = { fullName: string; phone: string | null; birthYear: number | null; position: string | null; address: string | null }

const norm = (text: string) => text.toLocaleLowerCase().replace(/[‘’ʻʼ`']/g, '').replace(/\s+/g, ' ').trim()
const has = (header: string, words: string[]) => words.some((word) => header.includes(word))

function yearFrom(value: string) {
  const match = value.match(/(19|20)\d{2}/)
  const year = match ? Number(match[0]) : NaN
  return year >= 1900 && year <= new Date().getFullYear() ? year : null
}

// Detects the header row (F.I.O / familiya / ism / telefon / tug'ilgan yili ...) and maps the client rows.
export function extractClients(rows: string[][]) {
  let headerIndex = -1
  let columns: Record<string, number> = {}
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const headers = rows[i]!.map(norm)
    const found: Record<string, number> = {}
    headers.forEach((header, index) => {
      if (!header) return
      if (has(header, ['f.i.o', 'fio', 'ф.и.о', 'фио', 'full name', 'ism-familiya', 'ism familiya', 'ismi sharifi', 'ф. и. о'])) found.full ??= index
      else if (has(header, ['familiya', 'фамилия', 'surname', 'last name'])) found.last ??= index
      else if (has(header, ['otasining', 'sharifi', 'отчество', 'middle'])) found.middle ??= index
      else if (has(header, ['ism', 'имя', 'name'])) found.first ??= index
      else if (has(header, ['tel', 'тел', 'phone'])) found.phone ??= index
      else if (has(header, ['tug', 'yil', 'year', 'birth', 'рожд', 'год'])) found.birth ??= index
      else if (has(header, ['lavozim', 'должность', 'position', 'kasb'])) found.position ??= index
      else if (has(header, ['manzil', 'адрес', 'address'])) found.address ??= index
    })
    if (found.full !== undefined || found.last !== undefined || found.first !== undefined) {
      headerIndex = i
      columns = found
      break
    }
  }
  if (headerIndex < 0) {
    // No header: use the first column that mostly holds multi-word text as the full name.
    const sample = rows.slice(0, 20)
    const width = Math.max(0, ...sample.map((row) => row.length))
    for (let col = 0; col < width; col++) {
      const score = sample.filter((row) => /^[^\d]{3,}\s+[^\d]{2,}/.test(row[col] || '')).length
      if (score >= Math.max(1, sample.length / 2)) { columns = { full: col }; break }
    }
    if (columns.full === undefined) throw createError({ statusCode: 400, statusMessage: 'Jadvalda F.I.O (ism-familiya) ustuni topilmadi' })
  }
  const clients: ClientRow[] = []
  let skipped = 0
  for (const row of rows.slice(headerIndex + 1)) {
    const cell = (key: string) => (columns[key] === undefined ? '' : (row[columns[key]!] || '').trim())
    const fullName = (cell('full') || [cell('last'), cell('first'), cell('middle')].filter(Boolean).join(' ')).replace(/\s+/g, ' ').trim()
    if (!fullName || fullName.length < 3 || /^\d+$/.test(fullName)) { skipped++; continue }
    clients.push({
      fullName,
      phone: cell('phone') || null,
      birthYear: yearFrom(cell('birth')),
      position: cell('position') || null,
      address: cell('address') || null
    })
  }
  return { clients, skipped }
}

const digits = (value: string | null) => (value || '').replace(/\D/g, '').slice(-9)

// Links every client to an existing patient (same name, no conflicting phone/year) or creates one.
// Works in batches: a 2,000-row list costs a handful of queries instead of thousands.
export async function attachClients(contractId: number, clients: ClientRow[]) {
  const names = [...new Set(clients.map((client) => client.fullName))]
  const existing: Array<{ id: number; fullName: string; phone: string | null; birthYear: number | null; address: string | null }> = []
  for (let i = 0; i < names.length; i += 1000) {
    existing.push(...await prisma.patient.findMany({
      where: { fullName: { in: names.slice(i, i + 1000), mode: 'insensitive' } },
      select: { id: true, fullName: true, phone: true, birthYear: true, address: true }
    }))
  }
  const byName = new Map<string, typeof existing>()
  const add = (patient: (typeof existing)[number]) => {
    const key = patient.fullName.toLocaleLowerCase()
    byName.set(key, [...(byName.get(key) || []), patient])
  }
  existing.forEach(add)
  const compatible = (client: ClientRow, item: (typeof existing)[number]) =>
    (!client.phone || !item.phone || digits(client.phone) === digits(item.phone)) &&
    (!client.birthYear || !item.birthYear || client.birthYear === item.birthYear)

  let linked = 0
  const updates = new Map<number, { phone: string | null; birthYear: number | null; address: string | null }>()
  const pending: ClientRow[] = []
  const matched: Array<{ client: ClientRow; patientId: number }> = []
  for (const client of clients) {
    const patient = (byName.get(client.fullName.toLocaleLowerCase()) || []).find((item) => compatible(client, item))
    if (!patient) {
      // Rows repeated inside the same file collapse into one new patient.
      if (!pending.some((other) => other.fullName.toLocaleLowerCase() === client.fullName.toLocaleLowerCase() && compatible(client, { id: 0, ...other }))) pending.push(client)
      continue
    }
    linked++
    matched.push({ client, patientId: patient.id })
    if ((!patient.phone && client.phone) || (!patient.birthYear && client.birthYear) || (!patient.address && client.address)) {
      patient.phone ||= client.phone
      patient.birthYear ||= client.birthYear
      patient.address ||= client.address
      updates.set(patient.id, { phone: patient.phone, birthYear: patient.birthYear, address: patient.address })
    }
  }
  for (let i = 0; i < pending.length; i += 500) {
    const created = await prisma.patient.createManyAndReturn({
      data: pending.slice(i, i + 500).map(({ fullName, phone, birthYear, address }) => ({ fullName, phone, birthYear, address })),
      select: { id: true, fullName: true, phone: true, birthYear: true, address: true }
    })
    created.forEach(add)
  }
  // Clients that were pending now resolve to the patients just created.
  for (const client of clients) {
    if (matched.some((item) => item.client === client)) continue
    const patient = (byName.get(client.fullName.toLocaleLowerCase()) || []).find((item) => compatible(client, item))
    if (patient) matched.push({ client, patientId: patient.id })
  }
  if (updates.size) {
    await prisma.$transaction([...updates].map(([id, data]) => prisma.patient.update({ where: { id }, data })))
  }
  const links = [...new Map(matched.map(({ client, patientId }) => [patientId, { contractId, patientId, position: client.position }])).values()]
  let inserted = 0
  for (let i = 0; i < links.length; i += 1000) {
    inserted += (await prisma.contractClient.createMany({ data: links.slice(i, i + 1000), skipDuplicates: true })).count
  }
  return { created: pending.length, linked, duplicates: clients.length - inserted, total: clients.length }
}
