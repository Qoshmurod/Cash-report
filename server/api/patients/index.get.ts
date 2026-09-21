import { demoStore } from '../store'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const search = String(query.search || '').toLowerCase()
  const patients = demoStore.patients.filter((patient) =>
    !search || `${patient.fullName} ${patient.phone || ''}`.toLowerCase().includes(search)
  )
  return { patients, total: patients.length }
})
