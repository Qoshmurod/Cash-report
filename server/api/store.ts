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
