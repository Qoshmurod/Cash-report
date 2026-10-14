export function parseContractFields(fields: Record<string, any>) {
  const number = String(fields.number || '').trim()
  const organization = String(fields.organization || '').trim()
  if (!number || !organization) throw createError({ statusCode: 400, statusMessage: 'Shartnoma raqami va tashkilot nomi shart' })
  const date = (value: unknown) => {
    if (!value) return null
    const parsed = new Date(`${value}T00:00:00Z`)
    if (Number.isNaN(parsed.getTime())) throw createError({ statusCode: 400, statusMessage: 'Sana noto‘g‘ri' })
    return parsed
  }
  return {
    number: number.slice(0, 80),
    organization: organization.slice(0, 200),
    startDate: date(fields.startDate),
    endDate: date(fields.endDate),
    note: fields.note ? String(fields.note).trim().slice(0, 500) : null,
    active: fields.active === undefined ? true : fields.active === true || fields.active === 'true'
  }
}

export const contractListSelect = {
  id: true, number: true, organization: true, startDate: true, endDate: true, note: true, active: true,
  fileName: true, clientsFileName: true, createdAt: true, _count: { select: { clients: true, payments: true } }
} as const
