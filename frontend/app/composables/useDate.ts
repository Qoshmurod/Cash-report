type Parts = Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', string>

function partsIn(date: Date, timeZone: string): Parts {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const out: Parts = { year: '', month: '', day: '', hour: '', minute: '', second: '' }
  for (const p of fmt.formatToParts(date)) {
    if (p.type in out) out[p.type as keyof Parts] = p.value
  }
  return out
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function useDate() {
  const settings = useSettingsStore()
  const tz = () => settings.timezone

  function formatDateTime(value: string | Date | null | undefined, withSeconds = false): string {
    const d = toDate(value)
    if (!d) return '—'
    const p = partsIn(d, tz())
    return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}${withSeconds ? `:${p.second}` : ''}`
  }

  function formatDate(value: string | Date | null | undefined): string {
    if (!value) return '—'
    // date-only strings (YYYY-MM-DD) must not be shifted by timezone
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-')
      return `${d}.${m}.${y}`
    }
    const d = toDate(value)
    if (!d) return '—'
    const p = partsIn(d, tz())
    return `${p.day}.${p.month}.${p.year}`
  }

  function formatTime(value: string | Date | null | undefined, withSeconds = false): string {
    const d = toDate(value)
    if (!d) return '—'
    const p = partsIn(d, tz())
    return `${p.hour}:${p.minute}${withSeconds ? `:${p.second}` : ''}`
  }

  /** YYYY-MM-DD in the hospital timezone */
  function isoDate(value: Date = new Date()): string {
    const p = partsIn(value, tz())
    return `${p.year}-${p.month}-${p.day}`
  }

  function daysAgo(n: number): string {
    return isoDate(new Date(Date.now() - n * 86_400_000))
  }

  function startOfMonth(): string {
    const p = partsIn(new Date(), tz())
    return `${p.year}-${p.month}-01`
  }

  function age(birthDate: string | null | undefined): number | null {
    if (!birthDate) return null
    const b = new Date(`${birthDate.slice(0, 10)}T00:00:00`)
    if (Number.isNaN(b.getTime())) return null
    const now = new Date()
    let a = now.getFullYear() - b.getFullYear()
    const m = now.getMonth() - b.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--
    return a
  }

  function minutesBetween(from: string | null | undefined, to: string | null | undefined = new Date().toISOString()): number | null {
    const a = toDate(from)
    const b = toDate(to)
    if (!a || !b) return null
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60_000))
  }

  return { formatDateTime, formatDate, formatTime, isoDate, daysAgo, startOfMonth, age, minutesBetween }
}
