export function useLogout() {
  const api = useApi()
  const auth = useAuthStore()
  const realtime = useRealtimeStore()
  const router = useRouter()

  return async function logout() {
    const refreshToken = auth.refreshToken
    try {
      await api.post('/auth/logout', { refreshToken: refreshToken ?? undefined }, { toastError: false })
    } catch {
      // token may already be expired — local session is cleared regardless
    }
    auth.clearSession()
    realtime.disconnect()
    await router.push('/login')
  }
}
