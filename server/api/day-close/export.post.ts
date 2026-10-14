import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { isDateString } from '../../utils/dates'
import { resolveClosureLines } from '../../utils/day-close'
import { closureWorkbook, sendWorkbook } from '../../utils/report'

// Downloads only the payment lines (services) the user ticked for the chosen day.
export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'DAY_CLOSE')
  const body = await readBody(event)
  if (!isDateString(body?.date)) throw createError({ statusCode: 400, statusMessage: 'Sana noto‘g‘ri' })
  const lines = await resolveClosureLines(body.date, body?.items)
  if (!lines.length) throw createError({ statusCode: 400, statusMessage: 'Kamida bitta xizmatni tanlang' })
  await audit(event, user, 'EXPORT', 'day-close', body.date, `${body.date} kunidan ${lines.length} ta qator yuklab olindi`)
  return sendWorkbook(event, await closureWorkbook(lines, body.date), `kun-${body.date}.xlsx`)
})
