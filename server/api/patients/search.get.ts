import { demoStore } from '../store'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const search = String(query.q || '').toLowerCase()
  return {
    patients: demoStore.patients.filter((patient) =>
      `${patient.fullName} ${patient.phone || ''}`.toLowerCase().includes(search)
    ).slice(0, 20)
  }
})
