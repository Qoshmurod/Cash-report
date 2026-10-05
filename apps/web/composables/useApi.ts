export const useApi = () => {
  const config = useRuntimeConfig()
  const request = async <T>(path: string, options: any = {}) => {
    const headers: Record<string,string> = { ...(options.headers || {}) }
    if (import.meta.server) {
      const cookie = useRequestHeaders(['cookie']).cookie
      if (cookie) headers.cookie = cookie
    }
    return await $fetch<T>(`${config.public.apiBase}${path}`, { credentials: 'include', ...options, headers })
  }
  return { request }
}
