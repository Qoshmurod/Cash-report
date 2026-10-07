<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { QueueTicket } from '~/types/api'

const { t } = useI18n()
const api = useApi()
const auth = useAuthStore()
const toast = useToast()
const labels = useLabels()
const realtime = useRealtime()
const { confirm } = useConfirm()
const { formatTime, isoDate, minutesBetween } = useDate()
const lookups = useLookupOptions()

const list = usePaginatedList<
  QueueTicket,
  { status: string | undefined; date: string | undefined; doctorId: string | undefined; departmentId: string | undefined }
>('/queues', {
  filters: { status: undefined, date: isoDate(), doctorId: undefined, departmentId: undefined },
  sortBy: 'createdAt',
  sortOrder: 'ASC',
  limit: 50,
})
const sortHeader = useSortHeader(list)
const refreshSoon = useThrottleFn(() => list.refresh(), 1500, true)
realtime.on('queue:updated', () => refreshSoon())
realtime.onReconnect(() => void list.refresh())
onMounted(() => {
  void lookups.store.loadDepartments().catch(() => undefined)
  void lookups.store.loadDoctors().catch(() => undefined)
})

const transferTicket = ref<QueueTicket | null>(null)
const isAdmin = computed(() => auth.hasRole('ADMIN'))

const columns = computed<TableColumn<QueueTicket>[]>(() => [
  { accessorKey: 'ticketNumber', header: sortHeader(t('queues.ticket'), 'sequence') },
  { id: 'patient', header: t('queues.patient') },
  { id: 'doctor', header: t('queues.doctor') },
  { id: 'services', header: t('payments.services') },
  { accessorKey: 'status', header: t('common.status') },
  { accessorKey: 'createdAt', header: sortHeader(t('queues.createdAt'), 'createdAt') },
  { id: 'actions', header: '' },
])

async function act(ticket: QueueTicket, action: 'call' | 'start' | 'complete' | 'skip' | 'requeue', successKey: string) {
  await api.post<QueueTicket>(`/queues/${ticket.id}/${action}`)
  toast.add({ title: t(successKey, { n: ticket.ticketNumber }), color: 'success', icon: 'i-lucide-check' })
  void list.refresh()
}

async function cancel(ticket: QueueTicket) {
  const r = await confirm({
    title: t('queues.cancelTitle', { n: ticket.ticketNumber }),
    color: 'error',
    icon: 'i-lucide-ban',
    confirmLabel: t('queues.cancel'),
    inputLabel: t('common.reason'),
  })
  if (!r.confirmed) return
  await api.post(`/queues/${ticket.id}/cancel`, { reason: r.value || undefined })
  toast.add({ title: t('toast.ticketCancelled', { n: ticket.ticketNumber }), color: 'success', icon: 'i-lucide-check' })
  void list.refresh()
}

function actions(tk: QueueTicket): DropdownMenuItem[][] {
  const main: DropdownMenuItem[] = []
  if (isAdmin.value && ['WAITING', 'SKIPPED', 'CALLED'].includes(tk.status))
    main.push({ label: tk.status === 'CALLED' ? t('queues.recall') : t('queues.call'), icon: 'i-lucide-megaphone', onSelect: () => void act(tk, 'call', 'toast.ticketCalled') })
  if (isAdmin.value && tk.status === 'CALLED') main.push({ label: t('queues.start'), icon: 'i-lucide-play', onSelect: () => void act(tk, 'start', 'toast.visitStarted') })
  if (isAdmin.value && tk.status === 'IN_PROGRESS') main.push({ label: t('queues.complete'), icon: 'i-lucide-check-check', onSelect: () => void act(tk, 'complete', 'toast.visitCompleted') })
  if (isAdmin.value && ['WAITING', 'CALLED'].includes(tk.status)) main.push({ label: t('queues.skip'), icon: 'i-lucide-skip-forward', onSelect: () => void act(tk, 'skip', 'toast.ticketSkipped') })
  if (tk.status === 'SKIPPED') main.push({ label: t('queues.requeue'), icon: 'i-lucide-rotate-ccw', onSelect: () => void act(tk, 'requeue', 'toast.ticketRequeued') })
  if (['WAITING', 'SKIPPED'].includes(tk.status)) main.push({ label: t('queues.transfer'), icon: 'i-lucide-arrow-right-left', onSelect: () => (transferTicket.value = tk) })
  const danger: DropdownMenuItem[] = []
  if (!['COMPLETED', 'CANCELLED'].includes(tk.status)) danger.push({ label: t('queues.cancel'), icon: 'i-lucide-ban', color: 'error', onSelect: () => void cancel(tk) })
  return [main, danger].filter((g) => g.length)
}

const statusTabs = computed(() => [
  { label: t('common.all'), value: '' },
  { label: t('queues.active'), value: 'WAITING,CALLED,IN_PROGRESS' },
  ...(['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED'] as const).map((s) => ({ label: labels.queueStatus(s), value: s })),
])
const statusTab = computed({
  get: () => list.filters.status ?? '',
  set: (v: string) => {
    list.filters.status = v || undefined
  },
})
</script>

<template>
  <div>
    <div class="mb-4 overflow-x-auto">
      <UTabs v-model="statusTab" :items="statusTabs" :content="false" size="sm" class="w-max" />
    </div>
    <ListToolbar v-model:search="list.search.value" :search-placeholder="t('queues.searchPlaceholder')" :active-filters="list.activeFilterCount.value" @reset="list.resetFilters">
      <template #filters>
        <UInput v-model="list.filters.date" type="date" :aria-label="t('common.date')" />
        <FilterSelect v-model="list.filters.departmentId" :items="lookups.departmentOptions.value" icon="i-lucide-building-2" />
        <FilterSelect v-model="list.filters.doctorId" :items="lookups.doctorOptions.value" icon="i-lucide-stethoscope" />
      </template>
      <template #actions>
        <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="list.loading.value" :label="t('common.refresh')" @click="list.refresh" />
        <UButton to="/display" target="_blank" color="neutral" variant="outline" icon="i-lucide-monitor" :label="t('nav.display')" />
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
      :empty-title="t('queues.empty')"
      empty-icon="i-lucide-list-ordered"
      @retry="list.refresh"
    >
      <template #ticketNumber-cell="{ row }">
        <span class="font-mono text-lg font-bold text-highlighted">{{ row.original.ticketNumber }}</span>
      </template>
      <template #patient-cell="{ row }">
        <p class="font-medium text-highlighted">{{ personName(row.original.patient) }}</p>
        <p class="text-xs text-muted">{{ row.original.patient?.phone }}</p>
      </template>
      <template #doctor-cell="{ row }">
        <p>{{ doctorName(row.original.doctor) }}</p>
        <p class="text-xs text-muted">
          {{ row.original.department ? lookups.depName(row.original.department) : '' }}
          <template v-if="row.original.roomNumber"> · {{ t('queues.roomShort', { room: row.original.roomNumber }) }}</template>
        </p>
      </template>
      <template #services-cell="{ row }">
        <span class="line-clamp-2 max-w-56 text-muted">{{ row.original.services.map((s) => s.name).join(', ') }}</span>
      </template>
      <template #status-cell="{ row }">
        <StatusBadge kind="queue" :value="row.original.status" />
        <p v-if="row.original.calledCount > 1" class="mt-0.5 text-xs text-muted">{{ t('queues.calledTimes', { n: row.original.calledCount }) }}</p>
      </template>
      <template #createdAt-cell="{ row }">
        <span class="tabular">{{ formatTime(row.original.createdAt) }}</span>
        <p v-if="row.original.status === 'WAITING'" class="text-xs text-muted">{{ t('queues.waitingFor', { n: minutesBetween(row.original.createdAt) }) }}</p>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end">
          <UDropdownMenu v-if="actions(row.original).length" :items="actions(row.original)" :content="{ align: 'end' }">
            <UButton color="neutral" variant="ghost" icon="i-lucide-ellipsis-vertical" :aria-label="t('common.actions')" />
          </UDropdownMenu>
        </div>
      </template>
    </DataTable>
    <QueueTransferModal :ticket="transferTicket" @close="transferTicket = null" @done="() => { transferTicket = null; list.refresh() }" />
  </div>
</template>
