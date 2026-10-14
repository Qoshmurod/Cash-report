type Meta = {
  departments: { value: string; label: string }[]
  methods: { value: string; label: string }[]
  permissionGroups: { section: string; items: { code: string; label: string }[] }[]
}

export function useMeta() {
  const meta = useState<Meta | null>('meta', () => null)
  if (!meta.value && import.meta.client) {
    $fetch<Meta>('/api/meta').then((value) => { meta.value = value }).catch(() => {})
  }
  const departments = computed(() => meta.value?.departments || [])
  const methods = computed(() => meta.value?.methods || [])
  const permissionGroups = computed(() => meta.value?.permissionGroups || [])
  const depLabel = (value: string) => departments.value.find((item) => item.value === value)?.label || value
  const methodLabel = (value: string) => methods.value.find((item) => item.value === value)?.label || value
  return { meta, departments, methods, permissionGroups, depLabel, methodLabel }
}
