// Clinic-local day boundaries. Uzbekistan is UTC+5 without DST; override with APP_TZ_OFFSET_MINUTES.
export function tzOffsetMs() {
  const minutes = Number(process.env.APP_TZ_OFFSET_MINUTES ?? 300)
  return (Number.isFinite(minutes) ? minutes : 300) * 60 * 1000
}

export function isDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

export function dayStart(date: string) {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) - tzOffsetMs())
}

export function dayEnd(date: string) {
  return new Date(dayStart(date).getTime() + 24 * 60 * 60 * 1000 - 1)
}

export function localDateString(value: Date = new Date()) {
  return new Date(value.getTime() + tzOffsetMs()).toISOString().slice(0, 10)
}

export function localDateTimeString(value: Date) {
  return new Date(value.getTime() + tzOffsetMs()).toISOString().slice(0, 16).replace('T', ' ')
}

export function parseRange(from: unknown, to: unknown) {
  if ((from && !isDateString(from)) || (to && !isDateString(to))) {
    throw createError({ statusCode: 400, statusMessage: 'Sana oralig‘i noto‘g‘ri' })
  }
  const range: { gte?: Date; lte?: Date } = {}
  if (from) range.gte = dayStart(from as string)
  if (to) range.lte = dayEnd(to as string)
  return Object.keys(range).length ? range : undefined
}
