export type CurrentUser = {
  id: number
  username: string
  fullName: string | null
  isSuperAdmin: boolean
  roleName: string | null
  permissions: string[]
  grantable: string[]
  departments: string[]
  mustChangePassword: boolean
}

export function useAuth() {
  const user = useState<CurrentUser | null>('auth-user', () => null)
  const loaded = useState('auth-loaded', () => false)

  async function refresh() {
    try {
      const result = await $fetch<{ user: CurrentUser }>('/api/auth/me')
      user.value = result.user
    } catch {
      user.value = null
    }
    loaded.value = true
    return user.value
  }

  const can = (code: string) => Boolean(user.value?.isSuperAdmin || user.value?.permissions.includes(code))
  const canAny = (...codes: string[]) => codes.some(can)

  // Navigation entries are shown only for sections the current user can open.
  const navItems = computed(() => {
    if (!user.value) return []
    const items = [
      { to: '/admin/kassa', icon: '💰', key: 'cash', show: canAny('PAYMENTS_VIEW', 'PAYMENTS_CREATE') },
      { to: '/admin/patients', icon: '👥', key: 'patients', show: canAny('PATIENTS_VIEW', 'PAYMENTS_CREATE') },
      { to: '/admin/reception', icon: '📋', key: 'reception', show: can('APPOINTMENTS_VIEW') },
      { to: '/admin/department', icon: '🧪', key: 'departments', show: can('PAYMENTS_VIEW') || (can('DEPARTMENTS_VIEW') && user.value.departments.length > 0) },
      { to: '/admin/contracts', icon: '📄', key: 'contracts', show: canAny('CONTRACTS_VIEW', 'CONTRACTS_MANAGE', 'GUARANTEE_LETTERS_VIEW', 'GUARANTEE_LETTERS_UPLOAD') },
      { to: '/admin/day-close', icon: '🔒', key: 'dayClose', show: can('DAY_CLOSE') },
      { to: '/admin/catalog', icon: '🩺', key: 'catalog', show: canAny('SERVICES_VIEW', 'DOCTORS_VIEW') },
      { to: '/admin/staff', icon: '👔', key: 'staff', show: can('STAFF_VIEW') },
      { to: '/admin/permissions', icon: '🔑', key: 'grants', show: Boolean(user.value.isSuperAdmin || user.value.grantable.length) },
      { to: '/admin/audit', icon: '📜', key: 'audit', show: can('AUDIT_VIEW') },
      { to: '/admin', icon: '👑', key: 'superAdmin', show: user.value.isSuperAdmin }
    ]
    return items.filter((item) => item.show)
  })

  return { user, loaded, refresh, can, canAny, navItems }
}

export function apiError(error: any, fallback = 'Xatolik yuz berdi') {
  return error?.data?.statusMessage || error?.statusMessage || error?.message || fallback
}

export function formatSum(value: number) {
  return new Intl.NumberFormat('uz-UZ').format(value || 0) + ' so‘m'
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function todayString() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export async function downloadBlob(url: string, body: unknown, fileName: string) {
  const blob = await $fetch<Blob>(url, { method: 'POST', body: body as any, responseType: 'blob' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  link.click()
  URL.revokeObjectURL(link.href)
}
