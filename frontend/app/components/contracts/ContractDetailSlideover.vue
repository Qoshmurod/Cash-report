<script setup lang="ts">
import type { ContractDetail, Patient, Payment } from '~/types/api'

const props = defineProps<{ contractId: string | null }>()
const emit = defineEmits<{ close: []; changed: [] }>()
const { t } = useI18n()
const api = useApi()
const auth = useAuthStore()
const toast = useToast()
const { confirm } = useConfirm()
const { format } = useMoney()
const { formatDate, formatDateTime } = useDate()
const isAdmin = computed(() => auth.can('contracts'))

const open = computed({
  get: () => !!props.contractId,
  set: (v: boolean) => {
    if (!v) emit('close')
  },
})
const contract = ref<ContractDetail | null>(null)
const loading = ref(false)
const busy = ref(false)
const tab = ref('patients')
const usage = ref<Payment[]>([])
const usageLoading = ref(false)
const tabs = computed(() => [
  { value: 'patients', label: t('contracts.patients'), icon: 'i-lucide-users' },
  { value: 'deposits', label: t('contracts.deposits'), icon: 'i-lucide-banknote-arrow-down' },
  { value: 'guarantees', label: t('guarantees.tab'), icon: 'i-lucide-shield-check' },
  { value: 'usage', label: t('contracts.usage'), icon: 'i-lucide-receipt' },
  ...(isAdmin.value ? [{ value: 'settings', label: t('nav.settings'), icon: 'i-lucide-settings' }] : []),
])

async function load() {
  if (!props.contractId) return
  loading.value = true
  try {
    contract.value = await api.get<ContractDetail>(`/contracts/${props.contractId}`, undefined, { toastError: true })
    syncSettings()
  } catch {
    emit('close')
  } finally {
    loading.value = false
  }
}
watch(
  () => props.contractId,
  () => {
    tab.value = 'patients'
    usage.value = []
    void load()
  },
  { immediate: true },
)
function changed(c: ContractDetail) {
  contract.value = c
  syncSettings()
  emit('changed')
}

// ─── Patients ───
const patientQuery = ref('')
const patientResults = ref<Patient[]>([])
const searching = ref(false)
const listedIds = computed(() => new Set(contract.value?.patients.map((p) => p.patientId) ?? []))
const searchPatients = useDebounceFn(async () => {
  const q = patientQuery.value.trim()
  if (q.length < 2) {
    patientResults.value = []
    return
  }
  searching.value = true
  try {
    patientResults.value = (await api.list<Patient>('/patients', { search: q, limit: 8 })).data
  } finally {
    searching.value = false
  }
}, 300)
watch(patientQuery, () => void searchPatients())
async function addPatient(p: Patient) {
  if (!contract.value) return
  busy.value = true
  try {
    changed(await api.post<ContractDetail>(`/contracts/${contract.value.id}/patients`, { patientIds: [p.id] }))
    toast.add({ title: t('contracts.patientAdded', { name: personName(p) }), color: 'success', icon: 'i-lucide-check' })
  } finally {
    busy.value = false
  }
}
const newPatientOpen = ref(false)
async function onNewPatient(p: Patient) {
  newPatientOpen.value = false
  await addPatient(p)
}
async function removePatient(patientId: string, name: string) {
  if (!contract.value) return
  const r = await confirm({ title: t('contracts.removePatientTitle'), description: name, confirmLabel: t('common.remove'), color: 'error', icon: 'i-lucide-user-minus' })
  if (!r.confirmed) return
  changed(await api.del<ContractDetail>(`/contracts/${contract.value.id}/patients/${patientId}`))
}

// ─── Deposits ───
const deposit = reactive({ amount: 0, depositDate: '', documentNumber: '', note: '' })
async function addDeposit() {
  if (!contract.value || !deposit.amount) return
  busy.value = true
  try {
    changed(
      await api.post<ContractDetail>(`/contracts/${contract.value.id}/deposits`, {
        amount: deposit.amount,
        depositDate: deposit.depositDate || undefined,
        documentNumber: deposit.documentNumber.trim() || null,
        note: deposit.note.trim() || null,
      }),
    )
    toast.add({ title: t('contracts.depositAdded', { amount: format(deposit.amount) }), color: 'success', icon: 'i-lucide-check' })
    Object.assign(deposit, { amount: 0, depositDate: '', documentNumber: '', note: '' })
  } finally {
    busy.value = false
  }
}

// ─── Usage ───
watch(tab, async (v) => {
  if (v !== 'usage' || !contract.value || usage.value.length) return
  usageLoading.value = true
  try {
    usage.value = (await api.list<Payment>('/payments', { contractId: contract.value.id, limit: 100 })).data
  } finally {
    usageLoading.value = false
  }
})

// ─── Settings ───
const settings = reactive({ organization: '', contractAmount: 0, startDate: '', endDate: '', warningThresholdPercent: 10, isActive: true })
function syncSettings() {
  if (!contract.value) return
  Object.assign(settings, {
    organization: contract.value.organization ?? '',
    contractAmount: contract.value.contractAmount ?? 0,
    startDate: contract.value.startDate ?? '',
    endDate: contract.value.endDate ?? '',
    warningThresholdPercent: contract.value.warningThresholdPercent,
    isActive: contract.value.isActive,
  })
}
async function saveSettings() {
  if (!contract.value) return
  busy.value = true
  try {
    changed(
      await api.patch<ContractDetail>(`/contracts/${contract.value.id}`, {
        organization: settings.organization.trim() || null,
        contractAmount: settings.contractAmount > 0 ? settings.contractAmount : null,
        startDate: settings.startDate || null,
        endDate: settings.endDate || null,
        warningThresholdPercent: settings.warningThresholdPercent,
        isActive: settings.isActive,
      }),
    )
    toast.add({ title: t('toast.settingsSaved'), color: 'success', icon: 'i-lucide-check' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <USlideover v-model:open="open" :title="contract ? t('contracts.detailTitle', { n: contract.contractNumber }) : t('contracts.contract')" :ui="{ content: 'max-w-2xl' }">
    <template #body>
      <div v-if="loading || !contract" class="space-y-3">
        <USkeleton v-for="i in 6" :key="i" class="h-8" />
      </div>
      <div v-else class="space-y-5">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="font-semibold text-highlighted">{{ contract.organization ?? '—' }}</p>
            <p class="text-xs text-muted tabular">
              {{ contract.startDate ? formatDate(contract.startDate) : '…' }} — {{ contract.endDate ? formatDate(contract.endDate) : '…' }}
              · {{ t('contracts.thresholdShort', { p: contract.warningThresholdPercent }) }}
            </p>
          </div>
          <UBadge :color="contract.isActive ? 'success' : 'neutral'" variant="subtle">{{ contract.isActive ? t('contracts.active') : t('contracts.inactive') }}</UBadge>
        </div>
        <ContractBalanceBar :contract="contract" />

        <UTabs v-model="tab" :items="tabs" :content="false" size="sm" />

        <!-- Patients -->
        <div v-if="tab === 'patients'" class="space-y-3">
          <div class="flex flex-wrap gap-2">
            <UInput id="cp-search" v-model="patientQuery" icon="i-lucide-search" :loading="searching" :placeholder="t('contracts.searchPatient')" class="min-w-0 flex-1" />
            <UButton color="neutral" variant="outline" icon="i-lucide-user-plus" :label="t('contracts.newPatient')" @click="newPatientOpen = true" />
          </div>
          <ul v-if="patientResults.length" class="divide-y divide-default rounded-lg border border-default">
            <li v-for="p in patientResults" :key="p.id" class="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <div class="min-w-0">
                <p class="truncate font-medium">{{ personName(p, true) }}</p>
                <p class="text-xs text-muted">{{ p.patientCode }} · {{ p.phone }}</p>
              </div>
              <UBadge v-if="listedIds.has(p.id)" color="success" variant="subtle">{{ t('contracts.listed') }}</UBadge>
              <UButton v-else size="xs" icon="i-lucide-plus" :loading="busy" :label="t('contracts.addToList')" @click="addPatient(p)" />
            </li>
          </ul>
          <p class="text-sm font-semibold text-highlighted">{{ t('contracts.patientsList', { n: contract.patients.length }) }}</p>
          <ul v-if="contract.patients.length" class="max-h-96 divide-y divide-default overflow-y-auto rounded-lg border border-default">
            <li v-for="row in contract.patients" :key="row.id" class="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <div class="min-w-0">
                <p class="truncate font-medium">{{ personName(row.patient, true) }}</p>
                <p class="text-xs text-muted">{{ row.patient?.patientCode }} · {{ row.patient?.phone }}<template v-if="row.patient?.passport"> · {{ row.patient.passport }}</template></p>
              </div>
              <UButton v-if="isAdmin" size="xs" color="error" variant="ghost" icon="i-lucide-user-minus" :aria-label="t('common.remove')" @click="removePatient(row.patientId, personName(row.patient, true))" />
            </li>
          </ul>
          <EmptyState v-else icon="i-lucide-users" :title="t('contracts.noPatients')" />
        </div>

        <!-- Deposits -->
        <div v-else-if="tab === 'deposits'" class="space-y-3">
          <div v-if="isAdmin" class="grid gap-3 rounded-lg bg-elevated/50 p-3 sm:grid-cols-2">
            <UFormField :label="t('contracts.transferAmount')" required :hint="t('contracts.correctionHint')">
              <UInputNumber id="dep-amount" v-model="deposit.amount" :step="100000" class="w-full" :format-options="{ useGrouping: true, maximumFractionDigits: 0 }" />
            </UFormField>
            <UFormField :label="t('contracts.transferDate')">
              <UInput id="dep-date" v-model="deposit.depositDate" type="date" class="w-full" />
            </UFormField>
            <UFormField :label="t('contracts.documentNumber')">
              <UInput id="dep-doc" v-model="deposit.documentNumber" placeholder="PP-123" class="w-full" />
            </UFormField>
            <UFormField :label="t('payments.note')">
              <UInput id="dep-note" v-model="deposit.note" class="w-full" />
            </UFormField>
            <div class="flex justify-end sm:col-span-2">
              <UButton :loading="busy" :disabled="!deposit.amount" icon="i-lucide-banknote-arrow-down" :label="t('contracts.addTransfer')" @click="addDeposit" />
            </div>
          </div>
          <ul v-if="contract.deposits.length" class="divide-y divide-default rounded-lg border border-default">
            <li v-for="d in contract.deposits" :key="d.id" class="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <div class="min-w-0">
                <p class="font-medium tabular">{{ formatDate(d.depositDate) }}<template v-if="d.documentNumber"> · {{ d.documentNumber }}</template></p>
                <p class="text-xs text-muted">{{ d.note ?? '' }}<template v-if="d.createdBy"> · {{ personName(d.createdBy) }}</template></p>
              </div>
              <MoneyText :value="d.amount" class="font-semibold" :class="d.amount < 0 ? 'text-error' : 'text-success'" />
            </li>
          </ul>
          <EmptyState v-else icon="i-lucide-banknote" :title="t('contracts.noDeposits')" />
        </div>

        <!-- Guarantee letters -->
        <ContractGuarantees v-else-if="tab === 'guarantees'" :contract="contract" @changed="changed" />

        <!-- Usage -->
        <div v-else-if="tab === 'usage'" class="space-y-2">
          <USkeleton v-if="usageLoading" class="h-24" />
          <ul v-else-if="usage.length" class="divide-y divide-default rounded-lg border border-default">
            <li v-for="p in usage" :key="p.id" class="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <div class="min-w-0">
                <p class="truncate font-medium">{{ personName(p.patient) }} <span class="font-mono text-xs text-muted">{{ p.receiptNumber }}</span></p>
                <p class="line-clamp-1 text-xs text-muted">{{ formatDateTime(p.createdAt) }} · {{ p.items.filter((i) => !i.removedAt).map((i) => i.serviceName).join(', ') }}</p>
              </div>
              <MoneyText :value="p.paidAmount - p.refundedAmount" class="font-semibold" />
            </li>
          </ul>
          <EmptyState v-else icon="i-lucide-receipt" :title="t('contracts.noUsage')" />
        </div>

        <!-- Settings -->
        <div v-else class="grid gap-4 sm:grid-cols-2">
          <UFormField :label="t('contracts.organization')" class="sm:col-span-2">
            <UInput id="cs-org" v-model="settings.organization" class="w-full" />
          </UFormField>
          <UFormField :label="t('guarantees.contractAmount')" class="sm:col-span-2" :hint="t('guarantees.contractAmountHint')">
            <UInputNumber id="cs-amount" v-model="settings.contractAmount" :min="0" :step="1000000" class="w-full" :format-options="{ useGrouping: true, maximumFractionDigits: 0 }" />
          </UFormField>
          <UFormField :label="t('contracts.startDate')">
            <UInput id="cs-start" v-model="settings.startDate" type="date" class="w-full" />
          </UFormField>
          <UFormField :label="t('contracts.endDate')">
            <UInput id="cs-end" v-model="settings.endDate" type="date" class="w-full" />
          </UFormField>
          <UFormField :label="t('contracts.threshold')" :hint="t('contracts.thresholdHint')">
            <UInputNumber id="cs-threshold" v-model="settings.warningThresholdPercent" :min="0" :max="100" class="w-full" />
          </UFormField>
          <UFormField :label="t('common.status')">
            <USwitch id="cs-active" v-model="settings.isActive" :label="settings.isActive ? t('contracts.active') : t('contracts.inactive')" />
          </UFormField>
          <div class="flex justify-end sm:col-span-2">
            <UButton :loading="busy" icon="i-lucide-check" :label="t('common.save')" @click="saveSettings" />
          </div>
        </div>
      </div>
    </template>
  </USlideover>
  <PatientFormSlideover v-model:open="newPatientOpen" @saved="onNewPatient" />
</template>
