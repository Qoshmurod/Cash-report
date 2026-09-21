import { demoStore } from '../store'

export default defineEventHandler(() => {
  const total = demoStore.payments.reduce((sum, payment) => sum + payment.amount, 0)
  const count = demoStore.payments.length
  const departmentStats = [...new Set(demoStore.payments.map((payment) => payment.department))]
    .map((department) => {
      const items = demoStore.payments.filter((payment) => payment.department === department)
      return { department, total: items.reduce((sum, payment) => sum + payment.amount, 0), count: items.length }
    })
  const period = { total, count }
  return { daily: period, weekly: period, monthly: period, yearly: period, departmentStats }
})
