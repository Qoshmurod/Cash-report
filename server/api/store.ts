export type Patient = {
  id: number
  fullName: string
  phone: string | null
  birthYear: number | null
  address: string | null
  note?: string | null
}

export type Payment = {
  id: number
  patientId: number
  department: string
  service: string | null
  amount: number
  note: string | null
  createdAt: string
  patient: Patient
}

const patients: Patient[] = []
const payments: Payment[] = []

export const demoStore = { patients, payments }

export function nextId(items: Array<{ id: number }>) {
  return items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1
}
