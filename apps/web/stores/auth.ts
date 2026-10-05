export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(null)
  const permissions = ref<string[]>([])
  const departments = ref<string[]>([])
  const loaded = ref(false)
  const { request } = useApi()

  async function load() {
    try {
      const r: any = await request('/auth/me')
      user.value = r.user; permissions.value = r.permissions || []; departments.value = r.departments || []
    } catch { user.value = null } finally { loaded.value = true }
  }
  async function login(login: string, password: string) {
    const r: any = await request('/auth/login', { method: 'POST', body: { login, password } })
    await load(); return r
  }
  async function logout() { await request('/auth/logout', { method: 'POST' }); user.value = null; await navigateTo('/login') }
  const can = (p: string) => !!user.value?.isOwner || permissions.value.includes(p)
  return { user, permissions, departments, loaded, load, login, logout, can }
})
