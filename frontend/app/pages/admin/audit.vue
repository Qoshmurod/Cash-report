<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AuditLog } from '~/types/api'
import { AUDIT_ACTION_COLOR } from '~/composables/useLabels'

definePageMeta({ roles: ['ADMIN'], titleKey: 'nav.audit' })

const { t, te } = useI18n()
const labels = useLabels()
const { formatDateTime } = useDate()
const list = usePaginatedList<
  AuditLog,
  { action: string | undefined; module: string | undefined; dateFrom: string | undefined; dateTo: string | undefined }
>('/audit', { filters: { action: undefined, module: undefined, dateFrom: undefined, dateTo: undefined } })
const sortHeader = useSortHeader(list)
const selected = ref<AuditLog | null>(null)
const open = computed({
  get: () => !!selected.value,
  set: (v: boolean) => {
    if (!v) selected.value = null
  },
})

const MODULES = ['auth', 'users', 'doctors', 'patients', 'departments', 'services', 'payments', 'queues', 'kiosk', 'settings', 'reports']
const moduleLabel = (m: string) => (te(`audit.modules.${m}`) ? t(`audit.modules.${m}`) : m)
const moduleOptions = computed(() => MODULES.map((m) => ({ value: m, label: moduleLabel(m) })))

const columns = computed<TableColumn<AuditLog>[]>(() => [
  { accessorKey: 'createdAt', header: sortHeader(t('common.date'), 'createdAt') },
  { id: 'user', header: t('audit.user') },
  { accessorKey: 'action', header: t('audit.action') },
  { accessorKey: 'module', header: t('audit.module') },
  { id: 'entity', header: t('audit.entity') },
  { accessorKey: 'description', header: t('common.description') },
  { accessorKey: 'ip', header: t('loginHistory.ip') },
])
</script>

<template>
  <AppPage :title="t('nav.audit')" :description="t('audit.subtitle')">
    <ListToolbar v-model:search="list.search.value" :active-filters="list.activeFilterCount.value" @reset="list.resetFilters">
      <template #filters>
        <FilterSelect v-model="list.filters.action" :items="labels.auditActionOptions.value" icon="i-lucide-zap" />
        <FilterSelect v-model="list.filters.module" :items="moduleOptions" icon="i-lucide-boxes" />
        <UInput v-model="list.filters.dateFrom" type="date" :aria-label="t('common.dateFrom')" />
        <UInput v-model="list.filters.dateTo" type="date" :aria-label="t('common.dateTo')" />
      </template>
      <template #actions>
        <ExportMenu type="audit" :query="list.query.value" />
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
      empty-icon="i-lucide-history"
      row-clickable
      @retry="list.refresh"
      @row-click="(a) => (selected = a)"
    >
      <template #createdAt-cell="{ row }"><span class="tabular">{{ formatDateTime(row.original.createdAt, true) }}</span></template>
      <template #user-cell="{ row }">
        <template v-if="row.original.user">
          <p class="font-medium text-highlighted">{{ personName(row.original.user) }}</p>
          <p class="text-xs text-muted">{{ row.original.user.login }} · {{ labels.role(row.original.user.role) }}</p>
        </template>
        <span v-else class="text-muted">{{ t('audit.system') }}</span>
      </template>
      <template #action-cell="{ row }">
        <UBadge :color="AUDIT_ACTION_COLOR[row.original.action]" variant="subtle">{{ labels.auditAction(row.original.action) }}</UBadge>
      </template>
      <template #module-cell="{ row }">{{ moduleLabel(row.original.module) }}</template>
      <template #entity-cell="{ row }">
        <p>{{ row.original.entity }}</p>
        <p v-if="row.original.entityId" class="max-w-32 truncate font-mono text-xs text-muted">{{ row.original.entityId }}</p>
      </template>
      <template #description-cell="{ row }"><span class="line-clamp-2 max-w-80">{{ row.original.description ?? '—' }}</span></template>
      <template #ip-cell="{ row }"><code class="text-xs">{{ row.original.ip ?? '—' }}</code></template>
    </DataTable>

    <USlideover v-model:open="open" :title="t('audit.detail')" :ui="{ content: 'max-w-2xl' }">
      <template #body>
        <div v-if="selected" class="space-y-5">
          <div class="divide-y divide-default rounded-lg border border-default px-3">
            <InfoRow :label="t('common.date')" :value="formatDateTime(selected.createdAt, true)" />
            <InfoRow :label="t('audit.user')" :value="selected.user ? `${personName(selected.user)} (${selected.user.login})` : t('audit.system')" />
            <InfoRow :label="t('audit.action')">
              <UBadge :color="AUDIT_ACTION_COLOR[selected.action]" variant="subtle">{{ labels.auditAction(selected.action) }}</UBadge>
            </InfoRow>
            <InfoRow :label="t('audit.module')" :value="moduleLabel(selected.module)" />
            <InfoRow :label="t('audit.entity')" :value="`${selected.entity}${selected.entityId ? ' · ' + selected.entityId : ''}`" />
            <InfoRow :label="t('common.description')" :value="selected.description" />
            <InfoRow :label="t('loginHistory.ip')" :value="selected.ip" />
            <InfoRow :label="t('audit.userAgent')" :value="selected.userAgent" />
          </div>
          <div>
            <h4 class="mb-2 text-sm font-semibold text-highlighted">{{ t('audit.changes') }}</h4>
            <JsonDiff :old-value="selected.oldValue" :new-value="selected.newValue" />
          </div>
        </div>
      </template>
    </USlideover>
  </AppPage>
</template>
