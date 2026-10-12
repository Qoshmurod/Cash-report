<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Payment } from '~/types/api'

const props = defineProps<{ exportable?: boolean }>()
const { t } = useI18n()
const labels = useLabels()
const { formatDateTime } = useDate()
const realtime = useRealtime()

const list = usePaginatedList<
  Payment,
  { status: string | undefined; method: string | undefined; dateFrom: string | undefined; dateTo: string | undefined }
>('/payments', { filters: { status: undefined, method: undefined, dateFrom: undefined, dateTo: undefined } })
const sortHeader = useSortHeader(list)
const selected = ref<string | null>(null)
realtime.on('payment:updated', () => void list.refresh())

const columns = computed<TableColumn<Payment>[]>(() => [
  { accessorKey: 'receiptNumber', header: t('payments.receipt') },
  { id: 'patient', header: t('payments.patient') },
  { id: 'services', header: t('payments.services') },
  { accessorKey: 'totalAmount', header: sortHeader(t('common.total'), 'totalAmount') },
  { accessorKey: 'paidAmount', header: sortHeader(t('payments.paid'), 'paidAmount') },
  { accessorKey: 'method', header: t('payments.method') },
  { accessorKey: 'status', header: t('common.status') },
  { accessorKey: 'createdAt', header: sortHeader(t('common.date'), 'createdAt') },
])
</script>

<template>
  <div>
    <ListToolbar v-model:search="list.search.value" :search-placeholder="t('payments.searchPlaceholder')" :active-filters="list.activeFilterCount.value" @reset="list.resetFilters">
      <template #filters>
        <FilterSelect v-model="list.filters.status" :items="labels.paymentStatusOptions.value" icon="i-lucide-circle-dot" />
        <FilterSelect v-model="list.filters.method" :items="labels.paymentMethodOptions.value" icon="i-lucide-credit-card" />
        <UInput v-model="list.filters.dateFrom" type="date" :aria-label="t('common.dateFrom')" />
        <UInput v-model="list.filters.dateTo" type="date" :aria-label="t('common.dateTo')" />
      </template>
      <template #actions>
        <ExportMenu v-if="props.exportable" type="payments" :query="list.query.value" />
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
      :empty-title="t('payments.empty')"
      empty-icon="i-lucide-wallet"
      row-clickable
      @retry="list.refresh"
      @row-click="(p) => (selected = p.id)"
    >
      <template #receiptNumber-cell="{ row }">
        <span class="font-mono text-xs">{{ row.original.receiptNumber }}</span>
      </template>
      <template #patient-cell="{ row }">
        <p class="font-medium text-highlighted">{{ personName(row.original.patient) }}</p>
        <p class="text-xs text-muted">{{ row.original.patient?.patientCode }}</p>
      </template>
      <template #services-cell="{ row }">
        <span class="line-clamp-2 max-w-64 text-muted">{{ row.original.items.map((i) => i.serviceName).join(', ') }}</span>
      </template>
      <template #totalAmount-cell="{ row }"><MoneyText :value="row.original.totalAmount" class="font-medium" /></template>
      <template #paidAmount-cell="{ row }">
        <MoneyText :value="row.original.paidAmount" />
        <p v-if="row.original.remainingAmount > 0" class="text-xs text-warning">
          {{ t('payments.debtShort') }}: <MoneyText :value="row.original.remainingAmount" :currency="false" />
        </p>
      </template>
      <template #method-cell="{ row }">
        <span class="flex items-center gap-1.5">
          <UIcon :name="PAYMENT_METHOD_ICON[row.original.method]" class="size-4 text-muted" />
          {{ labels.paymentMethod(row.original.method) }}
        </span>
      </template>
      <template #status-cell="{ row }"><StatusBadge kind="payment" :value="row.original.status" /></template>
      <template #createdAt-cell="{ row }"><span class="tabular text-muted">{{ formatDateTime(row.original.createdAt) }}</span></template>
    </DataTable>
    <PaymentDetailSlideover :payment-id="selected" @close="selected = null" @changed="list.refresh" />
  </div>
</template>
