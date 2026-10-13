import { FetchError } from 'ofetch'
import type { ApiErrorBody, ApiSuccess, PageMeta } from '~/types/api'
import { ApiError } from '~/utils/api-error'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type QueryValue = string | number | boolean | null | undefined | string[]
export type QueryParams = Record<string, QueryValue>

export interface RequestOptions {
  method?: HttpMethod
  query?: QueryParams
  body?: unknown
  /** Show a toast on error. Default: true for mutations, false for GET (pages render error states). */
  toastError?: boolean
  /** Skip auth header + refresh handling (public endpoints). */
  public?: boolean
  signal?: AbortSignal
}

export interface ApiResult<T> {
  data: T
  meta?: PageMeta
}

const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh']

function cleanQuery(query?: QueryParams): Record<string, string | number | boolean> | undefined {
  if (!query) return undefined
  const out: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      if (value.length) out[key] = value.join(',')
      continue
    }
    out[key] = value
  }
  return out
}

function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e
  if (e instanceof FetchError) {
    const body = e.data as ApiErrorBody | undefined
    if (body && body.success === false && body.error) {
      return new ApiError(body.error.statusCode, body.error.code, body.error.message, body.error.details)
    }
    if (!e.response) return new ApiError(0, 'NETWORK_ERROR', e.message)
    const status = e.response.status
    const code =
      status === 401
        ? 'UNAUTHORIZED'
        : status === 403
          ? 'FORBIDDEN'
          : status === 404
            ? 'NOT_FOUND'
            : status === 409
              ? 'CONFLICT'
              : status === 429
                ? 'TOO_MANY_REQUESTS'
                : status >= 500
                  ? 'INTERNAL_ERROR'
                  : 'BAD_REQUEST'
    return new ApiError(status, code, e.message)
  }
  if (e instanceof Error) return new ApiError(0, 'NETWORK_ERROR', e.message)
  return new ApiError(0, 'NETWORK_ERROR', String(e))
}

export function useApi() {
  const config = useRuntimeConfig()
  const auth = useAuthStore()
  const toast = useToast()
  const nuxtApp = useNuxtApp()
  const router = useRouter()

  function errorMessage(err: ApiError): { title: string; description?: string } {
    const t = nuxtApp.$i18n.t
    const key = `errors.${err.code}`
    const title = nuxtApp.$i18n.te(key) ? t(key) : t('errors.INTERNAL_ERROR')
    let description: string | undefined
    if (err.code === 'VALIDATION_ERROR' && err.validationMessages.length) {
      description = err.validationMessages.join('; ')
    } else if (err.code === 'CONFLICT' || err.code === 'BAD_REQUEST' || err.code === 'NOT_FOUND') {
      description = err.message
    }
    return { title, description }
  }

  function notifyError(err: ApiError) {
    const { title, description } = errorMessage(err)
    toast.add({ title, description, color: 'error', icon: 'i-lucide-circle-alert' })
  }

  async function handleAuthFailure() {
    auth.clearSession()
    const current = router.currentRoute.value
    if (current.path !== '/login') {
      await router.push({ path: '/login', query: { redirect: current.fullPath } })
    }
  }

  async function rawRequest<R>(path: string, opts: RequestOptions, responseType?: 'blob'): Promise<R> {
    const doFetch = () =>
      $fetch.raw<R>(path, {
        baseURL: config.public.apiBase,
        method: opts.method ?? 'GET',
        query: cleanQuery(opts.query),
        body: opts.body as Record<string, unknown> | undefined,
        signal: opts.signal,
        responseType: responseType ?? 'json',
        headers: !opts.public && auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : undefined,
      })

    try {
      const res = await doFetch()
      return (responseType === 'blob' ? (res as unknown as R) : (res._data as R))
    } catch (e) {
      let err = toApiError(e)
      if (err.statusCode === 401 && !opts.public && !NO_REFRESH_PATHS.includes(path) && auth.refreshToken) {
        const refreshed = await auth.refresh()
        if (refreshed) {
          try {
            const res = await doFetch()
            return (responseType === 'blob' ? (res as unknown as R) : (res._data as R))
          } catch (retryErr) {
            err = toApiError(retryErr)
          }
        }
      }
      if (err.statusCode === 401 && !NO_REFRESH_PATHS.includes(path) && !opts.public) {
        await handleAuthFailure()
      }
      if (err.code === 'PASSWORD_CHANGE_REQUIRED' && router.currentRoute.value.path !== '/change-password') {
        if (auth.user) auth.setUser({ ...auth.user, mustChangePassword: true })
        await router.push('/change-password')
      }
      const shouldToast = opts.toastError ?? (opts.method !== undefined && opts.method !== 'GET')
      if (shouldToast && err.statusCode !== 401) notifyError(err)
      throw err
    }
  }

  async function request<T>(path: string, opts: RequestOptions = {}): Promise<ApiResult<T>> {
    const res = await rawRequest<ApiSuccess<T>>(path, opts)
    return { data: res.data, meta: res.meta }
  }

  const get = <T>(path: string, query?: QueryParams, opts: Omit<RequestOptions, 'method' | 'query'> = {}) =>
    request<T>(path, { ...opts, method: 'GET', query }).then((r) => r.data)
  const list = <T>(path: string, query?: QueryParams, opts: Omit<RequestOptions, 'method' | 'query'> = {}) =>
    request<T[]>(path, { ...opts, method: 'GET', query })
  const post = <T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...opts, method: 'POST', body: body ?? {} }).then((r) => r.data)
  const patch = <T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...opts, method: 'PATCH', body: body ?? {} }).then((r) => r.data)
  const put = <T>(path: string, body?: unknown, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...opts, method: 'PUT', body: body ?? {} }).then((r) => r.data)
  const del = <T>(path: string, opts: Omit<RequestOptions, 'method'> = {}) =>
    request<T>(path, { ...opts, method: 'DELETE' }).then((r) => r.data)

  /** Downloads a binary endpoint (xlsx / pdf) and saves it via a temporary link. */
  async function download(path: string, query?: QueryParams, fallbackName = 'download'): Promise<void> {
    const res = await rawRequest<{ _data?: Blob; headers: Headers }>(path, { method: 'GET', query, toastError: true }, 'blob')
    const blob = res._data
    if (!blob) throw new ApiError(0, 'INTERNAL_ERROR', 'Empty file')
    const disposition = res.headers.get('content-disposition') ?? ''
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
    const filename = match?.[1] ? decodeURIComponent(match[1]) : fallbackName
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  /** Fetches a binary endpoint and opens it in a new tab (PDF preview). */
  async function openBlob(path: string, query?: QueryParams): Promise<void> {
    const res = await rawRequest<{ _data?: Blob; headers: Headers }>(path, { method: 'GET', query, toastError: true }, 'blob')
    if (!res._data) throw new ApiError(0, 'INTERNAL_ERROR', 'Empty file')
    const url = URL.createObjectURL(res._data)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return { request, get, list, post, patch, put, del, download, openBlob, notifyError, errorMessage }
}
