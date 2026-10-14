import { prisma } from './prisma'
import { dayEnd, dayStart } from './dates'
import { paymentInclude } from './payments'

export type ResolvedLine = { payment: any; serviceId: number | null; label: string; method: string; amount: number }

// Validates the lines the user ticked at day close: each is a service of a payment from that day
// (or the payment as a whole) with the amount actually received, never more than the payment total.
export async function resolveClosureLines(date: string, rawItems: unknown): Promise<ResolvedLine[]> {
  const items = Array.isArray(rawItems) ? rawItems : []
  const parsed = items.map((item: any) => ({
    paymentId: Number(item?.paymentId),
    serviceId: item?.serviceId === null || item?.serviceId === undefined || item?.serviceId === '' ? null : Number(item.serviceId),
    amount: Number(item?.amount)
  }))
  if (parsed.some((item) => !Number.isInteger(item.paymentId) || (item.serviceId !== null && !Number.isInteger(item.serviceId)) || !Number.isSafeInteger(item.amount) || item.amount < 0)) {
    throw createError({ statusCode: 400, statusMessage: 'Tanlangan qatorlarda xato bor' })
  }
  const ids = [...new Set(parsed.map((item) => item.paymentId))]
  const payments = await prisma.payment.findMany({
    where: { id: { in: ids }, createdAt: { gte: dayStart(date), lte: dayEnd(date) } },
    include: paymentInclude
  })
  const byId = new Map(payments.map((payment) => [payment.id, payment]))
  const seen = new Set<string>()
  const perPayment = new Map<number, number>()
  const lines: ResolvedLine[] = []
  for (const item of parsed) {
    const payment = byId.get(item.paymentId)
    if (!payment) throw createError({ statusCode: 400, statusMessage: `To‘lov #${item.paymentId} bu kunga tegishli emas` })
    const key = `${item.paymentId}:${item.serviceId ?? '-'}`
    if (seen.has(key)) continue
    seen.add(key)
    const link = item.serviceId === null ? null : payment.paymentServices.find((ps) => ps.serviceId === item.serviceId)
    if (item.serviceId !== null && !link) throw createError({ statusCode: 400, statusMessage: `To‘lov #${payment.id} da bunday xizmat yo‘q` })
    const total = (perPayment.get(payment.id) || 0) + item.amount
    if (total > payment.amount) {
      throw createError({ statusCode: 400, statusMessage: `To‘lov #${payment.id}: tanlangan summa (${total}) to‘lov summasidan (${payment.amount}) oshib ketdi` })
    }
    perPayment.set(payment.id, total)
    lines.push({
      payment,
      serviceId: item.serviceId,
      label: link ? link.service.name : payment.service || `To‘lov #${payment.id}`,
      method: payment.method,
      amount: item.amount
    })
  }
  return lines
}
