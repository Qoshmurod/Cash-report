<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { LoginHistory } from '~/types/api'

const props = defineProps<{ path: string; showUser?: boolean; syncRoute?: boolean; showFilters?: boolean }>()
const { t } = useI18n()
const { formatDateTime } = useDate()
const list = usePaginatedList<LoginHistory, { success: string | undefined; dateFrom: string | undefined; dateTo: string | undefined }>(
  () => props.path,
  { filters: { success: undefined, dateFrom: undefined, dateTo: undefined }, sortBy: 'loginAt', syncRoute: props.syncRoute ?? false, limit: 10 },
)
const sortHeader = useSortHeader(list)

const columns = computed<TableColumn<LoginHistory>[]>(() => [
  { accessorKey: 'loginAt', header: sortHeader(t('loginHistory.loginAt'), 'loginAt') },
  ...(props.showUser ? [{ id: 'user', header: t('loginHistory.user') } as TableColumn<LoginHistory>] : []),
  { accessorKey: 'ip', header: t('loginHistory.ip') },
  { id: 'client', header: t('loginHistory.client') },
  { accessorKey: 'logoutAt', header: t('loginHistory.logoutAt') },
  { accessorKey: 'success', header: t('loginHistory.status') },
])
const successOptions = computed(() => [
  { value: 'true', label: t('loginHistory.success') },
  { value: 'false', label: t('loginHistory.failure') },
])
const deviceIcon = (d: string | null) => (d === 'mobile' ? 'i-lucide-smartphone' : d === 'tablet' ? 'i-lucide-tablet' : 'i-lucide-monitor')
</script>

<template>
  <div>
    <ListToolbar v-if="props.showFilters" v-model:search="list.search.value" :active-filters="list.activeFilterCount.value" @reset="list.resetFilters">
      <template #filters>
        <FilterSelect v-model="list.filters.success" :items="successOptions" icon="i-lucide-shield" />
        <UInput v-model="list.filters.dateFrom" type="date" :aria-label="t('common.dateFrom')" />
        <UInput v-model="list.filters.dateTo" type="date" :aria-label="t('common.dateTo')" />
      </template>
      <template #actions>
        <slot name="actions" :query="list.query.value" />
      </template>
    </ListToolbar>
    <DataTable
      v-model:page="list.page.value"
      v-model:limit="list.limit.value"
      :data="list.items.value"
      :columns="columns"
      :loading="list.loading.value"
      :error="list.error.value"
      :meta="list.meta.value"
      empty-icon="i-lucide-log-in"
      @retry="list.refresh"
    >
      <template #loginAt-cell="{ row }">
        <span class="tabular">{{ formatDateTime(row.original.loginAt, true) }}</span>
      </template>
      <template #user-cell="{ row }">
        <div v-if="row.original.user" class="leading-tight">
          <p class="font-medium text-highlighted">{{ personName(row.original.user) }}</p>
          <p class="text-xs text-muted">{{ row.original.user.login }}</p>
        </div>
        <span v-else class="text-muted">{{ row.original.loginAttempt }}</span>
      </template>
      <template #ip-cell="{ row }">
        <code class="text-xs">{{ row.original.ip ?? '—' }}</code>
      </template>
      <template #client-cell="{ row }">
        <div class="flex items-center gap-2">
          <UIcon :name="deviceIcon(row.original.device)" class="size-4 text-muted" />
          <span>{{ [row.original.browser, row.original.os].filter(Boolean).join(' / ') || '—' }}</span>
        </div>
      </template>
      <template #logoutAt-cell="{ row }">
        <span class="tabular text-muted">{{ formatDateTime(row.original.logoutAt) }}</span>
      </template>
      <template #success-cell="{ row }">
        <UBadge :color="row.original.success ? 'success' : 'error'" variant="subtle">
          {{ row.original.success ? t('loginHistory.success') : t('loginHistory.failure') }}
        </UBadge>
        <p v-if="row.original.failureReason" class="mt-0.5 text-xs text-muted">{{ row.original.failureReason }}</p>
      </template>
    </DataTable>
  </div>
</template>
