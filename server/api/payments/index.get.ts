import { demoStore } from '../store'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const department = String(query.department || '')
  const search = String(query.search || '').toLowerCase()
  const payments = demoStore.payments.filter((payment) =>
    (!department || payment.department === department) &&
    (!search || payment.patient.fullName.toLowerCase().includes(search))
  )
  return { payments, totalSum: payments.reduce((sum, payment) => sum + payment.amount, 0) }
})
