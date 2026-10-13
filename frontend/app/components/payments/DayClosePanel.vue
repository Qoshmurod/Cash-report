<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { DayClosing, DayClosingPreview } from '~/types/api'

const props = defineProps<{ paymentsPath: string }>()
const { t } = useI18n()
const api = useApi()
const toast = useToast()
const realtime = useRealtime()
const { confirm } = useConfirm()
const { format } = useMoney()
const { formatDateTime, formatDate } = useDate()

const preview = ref<DayClosingPreview | null>(null)
const loadingPreview = ref(false)
const busy = ref(false)

const history = usePaginatedList<DayClosing>('/day-closings', { syncRoute: false, sortBy: 'closedAt' })

async function loadPreview() {
  loadingPreview.value = true
  try {
    preview.value = await api.get<DayClosingPreview>('/day-closings/pending')
  } finally {
    loadingPreview.value = false
  }
}
loadPreview()
realtime.on('payment:updated', () => {
  void loadPreview()
  void history.refresh()
})

const hasPending = computed(() => (preview.value?.transactionsCount ?? 0) > 0)
const fromEarlierDay = computed(() => !!preview.value?.oldestAt && formatDate(preview.value.oldestAt) !== formatDate(new Date().toISOString()))

async function closeDay() {
  if (!preview.value) return
  const r = await confirm({
    title: t('payments.dayClose.confirmTitle'),
    description: t('payments.dayClose.confirmDescription', { amount: format(preview.value.amount), n: preview.value.paymentsCount }),
    confirmLabel: t('payments.dayClose.closeButton'),
    color: 'warning',
    icon: 'i-lucide-lock-keyhole',
    inputLabel: t('payments.note'),
  })
  if (!r.confirmed) return
  busy.value = true
  try {
    const closing = await api.post<DayClosing>('/day-closings', { note: r.value || undefined })
    toast.add({ title: t('toast.dayClosed', { amount: format(closing.amount) }), color: 'success', icon: 'i-lucide-check' })
    await Promise.all([loadPreview(), history.refresh()])
  } finally {
    busy.value = false
  }
}

const columns = computed<TableColumn<DayClosing>[]>(() => [
  { accessorKey: 'closingDate', header: t('payments.dayClose.date') },
  { accessorKey: 'amount', header: t('payments.dayClose.amount') },
  { accessorKey: 'paymentsCount', header: t('payments.dayClose.paymentsCount') },
  { accessorKey: 'closedAt', header: t('payments.dayClose.closedAt') },
  { id: 'closedBy', header: t('payments.dayClose.closedBy') },
  { accessorKey: 'note', header: t('payments.note') },
])
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <div class="space-y-4">
        <div>
          <h3 class="font-semibold text-highlighted">{{ t('payments.dayClose.pendingTitle') }}</h3>
          <p class="mt-1 text-sm text-muted">{{ t('payments.dayClose.pendingDescription') }}</p>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard :label="t('payments.dayClose.amount')" :value="format(preview?.amount ?? 0)" icon="i-lucide-banknote" color="warning" :loading="loadingPreview" />
          <StatCard :label="t('payments.dayClose.paymentsCount')" :value="preview?.paymentsCount ?? 0" icon="i-lucide-receipt" color="info" :loading="loadingPreview" />
          <StatCard :label="t('payments.dayClose.refunded')" :value="format(preview?.refundedAmount ?? 0)" icon="i-lucide-undo-2" color="neutral" :loading="loadingPreview" />
        </div>
        <UAlert
          v-if="fromEarlierDay && preview?.oldestAt"
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :title="t('payments.dayClose.oldestWarning', { date: formatDateTime(preview.oldestAt) })"
        />
        <div class="flex flex-wrap justify-end gap-2">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-list"
            :label="t('payments.dayClose.viewPending')"
            :to="{ path: props.paymentsPath, query: { settlementStatus: 'PENDING' } }"
          />
          <UButton
            color="warning"
            icon="i-lucide-lock-keyhole"
            :loading="busy"
            :disabled="!hasPending"
            :label="hasPending ? t('payments.dayClose.closeButton') : t('payments.dayClose.nothing')"
            @click="closeDay"
          />
        </div>
      </div>
    </UCard>

    <div>
      <h3 class="mb-3 font-semibold text-highlighted">{{ t('payments.dayClose.history') }}</h3>
      <DataTable
        v-model:page="history.page.value"
        v-model:limit="history.limit.value"
        :data="history.items.value"
        :columns="columns"
        :loading="history.loading.value"
        :error="history.error.value"
        :meta="history.meta.value"
        :empty-title="t('payments.dayClose.nothing')"
        empty-icon="i-lucide-lock-keyhole"
        @retry="history.refresh"
      >
        <template #amount-cell="{ row }"><MoneyText :value="row.original.amount" class="font-medium" /></template>
        <template #closedAt-cell="{ row }"><span class="tabular text-muted">{{ formatDateTime(row.original.closedAt) }}</span></template>
        <template #closedBy-cell="{ row }">{{ personName(row.original.closedBy) }}</template>
        <template #note-cell="{ row }"><span class="text-muted">{{ row.original.note ?? '—' }}</span></template>
      </DataTable>
    </div>
  </div>
</template>
