<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ContractView } from '~/types/api'

const { t } = useI18n()
const auth = useAuthStore()
const api = useApi()
const toast = useToast()
const { format } = useMoney()
const { formatDate } = useDate()
const isAdmin = computed(() => auth.can('contracts'))

const list = usePaginatedList<ContractView, { active: string | undefined; lowBalance: string | undefined }>('/contracts', {
  filters: { active: 'true', lowBalance: undefined },
})
const selected = ref<string | null>(null)
const statusOptions = computed(() => [
  { value: 'true', label: t('contracts.active') },
  { value: 'false', label: t('contracts.inactive') },
])
const lowOptions = computed(() => [{ value: 'true', label: t('contracts.lowBalance') }])

const columns = computed<TableColumn<ContractView>[]>(() => [
  { accessorKey: 'contractNumber', header: t('contracts.number') },
  { accessorKey: 'organization', header: t('contracts.organization') },
  { id: 'period', header: t('contracts.period') },
  { accessorKey: 'deposited', header: t('contracts.deposited') },
  { accessorKey: 'spent', header: t('contracts.spent') },
  { accessorKey: 'balance', header: t('contracts.balance') },
  { accessorKey: 'debt', header: t('guarantees.debt') },
  { accessorKey: 'patientsCount', header: t('contracts.patients') },
  { id: 'state', header: t('common.status') },
])

// Create
const createOpen = ref(false)
const form = reactive({ contractNumber: '', organization: '', contractAmount: 0, startDate: '', endDate: '', warningThresholdPercent: 10, initialDeposit: 0, note: '' })
const templatesOpen = ref(false)
const busy = ref(false)
function openCreate() {
  Object.assign(form, { contractNumber: '', organization: '', contractAmount: 0, startDate: '', endDate: '', warningThresholdPercent: 10, initialDeposit: 0, note: '' })
  createOpen.value = true
}
async function create() {
  busy.value = true
  try {
    const c = await api.post<ContractView>('/contracts', {
      contractNumber: form.contractNumber.trim(),
      organization: form.organization.trim() || null,
      contractAmount: form.contractAmount > 0 ? form.contractAmount : null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      warningThresholdPercent: form.warningThresholdPercent,
      initialDeposit: form.initialDeposit > 0 ? form.initialDeposit : undefined,
      note: form.note.trim() || null,
    })
    createOpen.value = false
    toast.add({ title: t('contracts.created'), color: 'success', icon: 'i-lucide-check' })
    await list.refresh()
    selected.value = c.id
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <ListToolbar v-model:search="list.search.value" :search-placeholder="t('contracts.searchPlaceholder')" :active-filters="list.activeFilterCount.value" @reset="list.resetFilters">
      <template #filters>
        <FilterSelect v-model="list.filters.active" :items="statusOptions" icon="i-lucide-circle-dot" />
        <FilterSelect v-model="list.filters.lowBalance" :items="lowOptions" icon="i-lucide-triangle-alert" />
      </template>
      <template #actions>
        <UButton v-if="auth.can('contract_credit_approve')" color="neutral" variant="outline" icon="i-lucide-file-text" :label="t('guarantees.templates')" @click="templatesOpen = true" />
        <UButton v-if="isAdmin" icon="i-lucide-plus" :label="t('contracts.new')" @click="openCreate" />
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
      :empty-title="t('contracts.empty')"
      empty-icon="i-lucide-file-signature"
      row-clickable
      @retry="list.refresh"
      @row-click="(c) => (selected = c.id)"
    >
      <template #contractNumber-cell="{ row }"><span class="font-mono text-xs font-semibold">{{ row.original.contractNumber }}</span></template>
      <template #organization-cell="{ row }"><span class="font-medium text-highlighted">{{ row.original.organization ?? '—' }}</span></template>
      <template #period-cell="{ row }">
        <span class="text-xs text-muted tabular">{{ row.original.startDate ? formatDate(row.original.startDate) : '…' }} — {{ row.original.endDate ? formatDate(row.original.endDate) : '…' }}</span>
      </template>
      <template #deposited-cell="{ row }"><MoneyText :value="row.original.deposited" /></template>
      <template #spent-cell="{ row }"><MoneyText :value="row.original.spent" class="text-muted" /></template>
      <template #balance-cell="{ row }">
        <div class="min-w-36 space-y-1">
          <MoneyText :value="row.original.balance" class="font-semibold" :class="row.original.lowBalance ? 'text-warning' : ''" />
          <div class="h-1.5 overflow-hidden rounded-full bg-elevated">
            <div
              class="h-full rounded-full"
              :class="row.original.balance <= 0 ? 'bg-error' : row.original.lowBalance ? 'bg-warning' : 'bg-success'"
              :style="{ width: `${Math.max(0, Math.min(100, row.original.balancePercent))}%` }"
            />
          </div>
        </div>
      </template>
      <template #debt-cell="{ row }">
        <div>
          <MoneyText v-if="row.original.debt > 0" :value="row.original.debt" class="font-semibold text-error" />
          <span v-else class="text-muted">—</span>
          <p v-if="row.original.credit > 0" class="text-xs text-muted">{{ t('guarantees.creditShort', { amount: format(row.original.credit) }) }}</p>
        </div>
      </template>
      <template #state-cell="{ row }">
        <div class="flex flex-wrap gap-1">
          <UBadge v-if="!row.original.isActive" color="neutral" variant="subtle">{{ t('contracts.inactive') }}</UBadge>
          <UBadge v-else-if="row.original.lowBalance" color="warning" variant="subtle" icon="i-lucide-triangle-alert">
            {{ t('contracts.lowBalanceShort', { p: row.original.balancePercent }) }}
          </UBadge>
          <UBadge v-else color="success" variant="subtle">{{ t('contracts.active') }}</UBadge>
        </div>
      </template>
    </DataTable>

    <ContractDetailSlideover :contract-id="selected" @close="selected = null" @changed="list.refresh" />
    <GuaranteeTemplatesModal v-model:open="templatesOpen" />

    <UModal v-model:open="createOpen" :title="t('contracts.new')">
      <template #body>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField :label="t('contracts.number')" required>
            <UInput id="c-number" v-model="form.contractNumber" placeholder="SH-2026/040" class="w-full" />
          </UFormField>
          <UFormField :label="t('contracts.organization')">
            <UInput id="c-org" v-model="form.organization" class="w-full" />
          </UFormField>
          <UFormField :label="t('guarantees.contractAmount')" :hint="t('guarantees.contractAmountHint')">
            <UInputNumber id="c-amount" v-model="form.contractAmount" :min="0" :step="1000000" class="w-full" :format-options="{ useGrouping: true, maximumFractionDigits: 0 }" />
          </UFormField>
          <div class="hidden sm:block" />
          <UFormField :label="t('contracts.startDate')">
            <UInput id="c-start" v-model="form.startDate" type="date" class="w-full" />
          </UFormField>
          <UFormField :label="t('contracts.endDate')">
            <UInput id="c-end" v-model="form.endDate" type="date" class="w-full" />
          </UFormField>
          <UFormField :label="t('contracts.initialDeposit')">
            <UInputNumber id="c-deposit" v-model="form.initialDeposit" :min="0" :step="100000" class="w-full" :format-options="{ useGrouping: true, maximumFractionDigits: 0 }" />
          </UFormField>
          <UFormField :label="t('contracts.threshold')" :hint="t('contracts.thresholdHint')">
            <UInputNumber id="c-threshold" v-model="form.warningThresholdPercent" :min="0" :max="100" class="w-full" />
          </UFormField>
          <UFormField :label="t('payments.note')" class="sm:col-span-2">
            <UTextarea id="c-note" v-model="form.note" :rows="2" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" :label="t('common.cancel')" @click="createOpen = false" />
          <UButton :loading="busy" :disabled="!form.contractNumber.trim()" icon="i-lucide-check" :label="t('common.save')" @click="create" />
        </div>
      </template>
    </UModal>
  </div>
</template>
