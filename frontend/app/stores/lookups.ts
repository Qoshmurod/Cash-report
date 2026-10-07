import { defineStore } from 'pinia'
import type { Department, Doctor, Service } from '~/types/api'

const TTL_MS = 60_000

/** Cached reference data (departments / services / doctors) for selects and filters. */
export const useLookupsStore = defineStore('lookups', () => {
  const departments = ref<Department[]>([])
  const services = ref<Service[]>([])
  const doctors = ref<Doctor[]>([])
  const loadedAt = reactive({ departments: 0, services: 0, doctors: 0 })

  async function loadDepartments(force = false) {
    if (!force && Date.now() - loadedAt.departments < TTL_MS) return departments.value
    departments.value = await useApi().get<Department[]>('/departments', { all: true, sortBy: 'sortOrder', sortOrder: 'ASC' })
    loadedAt.departments = Date.now()
    return departments.value
  }

  async function loadServices(force = false) {
    if (!force && Date.now() - loadedAt.services < TTL_MS) return services.value
    services.value = await useApi().get<Service[]>('/services', { all: true, sortBy: 'name', sortOrder: 'ASC' })
    loadedAt.services = Date.now()
    return services.value
  }

  async function loadDoctors(force = false) {
    if (!force && Date.now() - loadedAt.doctors < TTL_MS) return doctors.value
    doctors.value = await useApi().get<Doctor[]>('/doctors', { limit: 100, sortBy: 'createdAt', sortOrder: 'ASC' })
    loadedAt.doctors = Date.now()
    return doctors.value
  }

  function invalidate() {
    loadedAt.departments = 0
    loadedAt.services = 0
    loadedAt.doctors = 0
  }

  return { departments, services, doctors, loadDepartments, loadServices, loadDoctors, invalidate }
})

/** Select options derived from lookups, localised. */
export function useLookupOptions() {
  const store = useLookupsStore()
  const { locale } = useI18n()
  const depName = (d: Department) => (locale.value === 'ru' && d.nameRu ? d.nameRu : d.name)
  const serviceName = (s: Service) => (locale.value === 'ru' && s.nameRu ? s.nameRu : s.name)

  const departmentOptions = computed(() => store.departments.map((d) => ({ value: d.id, label: depName(d) })))
  const doctorOptions = computed(() =>
    store.doctors.map((d) => ({ value: d.id, label: `${doctorName(d)} · ${d.specialty}` })),
  )
  const serviceOptions = computed(() => store.services.map((s) => ({ value: s.id, label: `${serviceName(s)} (${s.code})` })))

  return { store, departmentOptions, doctorOptions, serviceOptions, depName, serviceName }
}
