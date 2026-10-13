import { useDebounceFn } from '@vueuse/core'
import type { PageMeta, SortOrder } from '~/types/api'
import { ApiError } from '~/utils/api-error'
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '~/utils/constants'
import type { QueryParams } from './useApi'

export interface PaginatedListOptions<F extends Record<string, string | undefined>> {
  /** Default filter values (keys define which query params are managed). */
  filters?: F
  sortBy?: string
  sortOrder?: SortOrder
  limit?: number
  /** Extra fixed query params (not synced to the URL). */
  extraQuery?: () => QueryParams
  /** Sync page / search / sort / filters to the route query. Default true. */
  syncRoute?: boolean
  immediate?: boolean
}

function str(v: unknown): string | undefined {
  if (Array.isArray(v)) return str(v[0])
  return typeof v === 'string' && v !== '' ? v : undefined
}

/**
 * Server-side paginated list with debounced search, sorting, filtering,
 * loading / error / empty states and URL query synchronisation.
 */
export function usePaginatedList<T, F extends Record<string, string | undefined> = Record<string, string | undefined>>(
  path: MaybeRefOrGetter<string>,
  options: PaginatedListOptions<F> = {},
) {
  const api = useApi()
  const route = useRoute()
  const router = useRouter()
  const syncRoute = options.syncRoute !== false
  const q = syncRoute ? route.query : {}

  const defaultFilters = { ...(options.filters ?? ({} as F)) }
  const initialFilters = { ...defaultFilters } as F
  for (const key of Object.keys(defaultFilters) as (keyof F & string)[]) {
    const v = str(q[key])
    if (v !== undefined) (initialFilters as Record<string, string | undefined>)[key] = v
  }

  const page = ref(Number(str(q.page)) || 1)
  const limit = ref(Number(str(q.limit)) || options.limit || DEFAULT_PAGE_SIZE)
  const search = ref(str(q.search) ?? '')
  const sortBy = ref(str(q.sortBy) ?? options.sortBy ?? 'createdAt')
  const sortOrder = ref<SortOrder>((str(q.sortOrder) as SortOrder | undefined) ?? options.sortOrder ?? 'DESC')
  const filters = reactive({ ...initialFilters }) as F

  const items = ref<T[]>([]) as Ref<T[]>
  const meta = ref<PageMeta>({ page: 1, limit: limit.value, total: 0, totalPages: 0 })
  const loading = ref(false)
  const error = ref<ApiError | null>(null)
  const loadedOnce = ref(false)
  let controller: AbortController | null = null

  const isEmpty = computed(() => !loading.value && !error.value && loadedOnce.value && items.value.length === 0)

  const query = computed<QueryParams>(() => ({
    page: page.value,
    limit: limit.value,
    search: search.value.trim() || undefined,
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
    ...(filters as Record<string, string | undefined>),
    ...(options.extraQuery?.() ?? {}),
  }))

  async function fetch() {
    controller?.abort()
    const current = new AbortController()
    controller = current
    loading.value = true
    error.value = null
    try {
      const res = await api.list<T>(toValue(path), query.value, { signal: current.signal })
      if (current.signal.aborted) return
      items.value = res.data
      meta.value = res.meta ?? { page: page.value, limit: limit.value, total: res.data.length, totalPages: 1 }
      loadedOnce.value = true
    } catch (e) {
      if (current.signal.aborted) return
      error.value = e instanceof ApiError ? e : new ApiError(0, 'NETWORK_ERROR', String(e))
    } finally {
      if (controller === current) loading.value = false
    }
  }

  function syncToRoute() {
    if (!syncRoute) return
    const next: Record<string, string> = {}
    for (const [k, v] of Object.entries(route.query)) {
      const s = str(v)
      if (s !== undefined) next[k] = s
    }
    const managed: Record<string, string | number | undefined> = {
      page: page.value > 1 ? page.value : undefined,
      limit: limit.value !== (options.limit ?? DEFAULT_PAGE_SIZE) ? limit.value : undefined,
      search: search.value.trim() || undefined,
      sortBy: sortBy.value !== (options.sortBy ?? 'createdAt') ? sortBy.value : undefined,
      sortOrder: sortOrder.value !== (options.sortOrder ?? 'DESC') ? sortOrder.value : undefined,
      ...(filters as Record<string, string | undefined>),
    }
    for (const [k, v] of Object.entries(managed)) {
      if (v === undefined || v === '') delete next[k]
      else next[k] = String(v)
    }
    router.replace({ query: next })
  }

  function reload() {
    syncToRoute()
    return fetch()
  }

  const debouncedSearch = useDebounceFn(() => {
    page.value = 1
    reload()
  }, SEARCH_DEBOUNCE_MS)

  watch(search, () => debouncedSearch())
  watch(
    () => ({ ...(filters as Record<string, string | undefined>) }),
    () => {
      page.value = 1
      reload()
    },
    { deep: true },
  )
  watch([page, limit, sortBy, sortOrder], () => reload())
  if (typeof path !== 'string') watch(() => toValue(path), () => reload())

  function setSort(column: string) {
    if (sortBy.value === column) sortOrder.value = sortOrder.value === 'ASC' ? 'DESC' : 'ASC'
    else {
      sortBy.value = column
      sortOrder.value = 'ASC'
    }
  }

  function resetFilters() {
    Object.assign(filters, defaultFilters)
    search.value = ''
  }

  const activeFilterCount = computed(
    () =>
      Object.entries(filters as Record<string, string | undefined>).filter(
        ([k, v]) => v !== undefined && v !== '' && v !== (defaultFilters as Record<string, string | undefined>)[k],
      ).length,
  )

  if (options.immediate !== false) fetch()
  onScopeDispose(() => controller?.abort())

  return {
    items,
    meta,
    page,
    limit,
    search,
    sortBy,
    sortOrder,
    filters,
    loading,
    error,
    isEmpty,
    query,
    activeFilterCount,
    refresh: fetch,
    setSort,
    resetFilters,
  }
}
