import { defineStore } from 'pinia'
import type { AuthResponse, Role, User } from '~/types/api'
import { ROLE_HOME, STORAGE_KEYS } from '~/utils/constants'

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // storage unavailable (private mode) — session stays in memory only
  }
}

function readUser(): User | null {
  const raw = readStorage(STORAGE_KEYS.user)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const config = useRuntimeConfig()
  const accessToken = ref<string | null>(readStorage(STORAGE_KEYS.accessToken))
  const refreshToken = ref<string | null>(readStorage(STORAGE_KEYS.refreshToken))
  const user = ref<User | null>(readUser())
  let refreshPromise: Promise<boolean> | null = null

  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)
  const role = computed<Role | null>(() => user.value?.role ?? null)
  const homePath = computed(() => (role.value ? ROLE_HOME[role.value] : '/login'))
  const fullName = computed(() => (user.value ? `${user.value.lastName} ${user.value.firstName}`.trim() : ''))
  const mustChangePassword = computed(() => user.value?.mustChangePassword === true)

  function hasRole(...roles: Role[]) {
    return !!role.value && roles.includes(role.value)
  }

  function setUser(u: User | null) {
    user.value = u
    writeStorage(STORAGE_KEYS.user, u ? JSON.stringify(u) : null)
  }

  function setSession(res: AuthResponse) {
    accessToken.value = res.accessToken
    refreshToken.value = res.refreshToken
    writeStorage(STORAGE_KEYS.accessToken, res.accessToken)
    writeStorage(STORAGE_KEYS.refreshToken, res.refreshToken)
    setUser(res.user)
  }

  function clearSession() {
    accessToken.value = null
    refreshToken.value = null
    writeStorage(STORAGE_KEYS.accessToken, null)
    writeStorage(STORAGE_KEYS.refreshToken, null)
    setUser(null)
  }

  /** Rotates the refresh token. Single-flight: concurrent 401s share one refresh request. */
  function refresh(): Promise<boolean> {
    if (!refreshToken.value) return Promise.resolve(false)
    if (refreshPromise) return refreshPromise
    const token = refreshToken.value
    refreshPromise = $fetch<{ success: true; data: AuthResponse }>('/auth/refresh', {
      baseURL: config.public.apiBase,
      method: 'POST',
      body: { refreshToken: token },
    })
      .then((res) => {
        setSession(res.data)
        return true
      })
      .catch(() => {
        clearSession()
        return false
      })
      .finally(() => {
        refreshPromise = null
      })
    return refreshPromise
  }

  // Keep tabs in sync (logout / token rotation in another tab)
  if (import.meta.client) {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEYS.accessToken) accessToken.value = e.newValue
      if (e.key === STORAGE_KEYS.refreshToken) refreshToken.value = e.newValue
      if (e.key === STORAGE_KEYS.user) user.value = readUser()
    })
  }

  return {
    accessToken,
    refreshToken,
    user,
    isAuthenticated,
    role,
    homePath,
    fullName,
    mustChangePassword,
    hasRole,
    setUser,
    setSession,
    clearSession,
    refresh,
  }
})
