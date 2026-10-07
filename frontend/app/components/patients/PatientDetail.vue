<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Patient, PatientHistory, Payment, QueueTicket, Visit } from '~/types/api'
import { ApiError } from '~/utils/api-error'

const props = defineProps<{ id: string; backTo: string; readonly?: boolean }>()
const { t } = useI18n()
const api = useApi()
const labels = useLabels()
const { formatDate, formatDateTime, age } = useDate()

const patient = ref<Patient | null>(null)
const history = ref<PatientHistory | null>(null)
const loading = ref(true)
const error = ref<ApiError | null>(null)
const editOpen = ref(false)
const selectedPayment = ref<string | null>(null)
const tab = ref('payments')

async function load() {
  loading.value = true
  error.value = null
  try {
    const [p, h] = await Promise.all([api.get<Patient>(`/patients/${props.id}`), api.get<PatientHistory>(`/patients/${props.id}/history`)])
    patient.value = p
    history.value = h
  } catch (e) {
    error.value = e instanceof ApiError ? e : new ApiError(0, 'NETWORK_ERROR', String(e))
  } finally {
    loading.value = false
  }
}
onMounted(load)

const tabs = computed(() => [
  { label: t('patients.payments'), value: 'payments', icon: 'i-lucide-wallet', badge: history.value?.payments.length },
  { label: t('patients.tickets'), value: 'tickets', icon: 'i-lucide-list-ordered', badge: history.value?.tickets.length },
  { label: t('patients.visits'), value: 'visits', icon: 'i-lucide-stethoscope', badge: history.value?.visits.length },
])

const paymentColumns = computed<TableColumn<Payment>[]>(() => [
  { accessorKey: 'receiptNumber', header: t('payments.receipt') },
  { accessorKey: 'createdAt', header: t('common.date') },
  { id: 'services', header: t('payments.services') },
  { accessorKey: 'totalAmount', header: t('common.total') },
  { accessorKey: 'method', header: t('payments.method') },
  { accessorKey: 'status', header: t('common.status') },
])
const ticketColumns = computed<TableColumn<QueueTicket>[]>(() => [
  { accessorKey: 'ticketNumber', header: t('queues.ticket') },
  { accessorKey: 'queueDate', header: t('common.date') },
  { id: 'doctor', header: t('queues.doctor') },
  { id: 'services', header: t('payments.services') },
  { accessorKey: 'status', header: t('common.status') },
])
const visitColumns = computed<TableColumn<Visit>[]>(() => [
  { accessorKey: 'startedAt', header: t('visits.startedAt') },
  { accessorKey: 'endedAt', header: t('visits.endedAt') },
  { accessorKey: 'complaint', header: t('visits.complaint') },
  { accessorKey: 'diagnosis', header: t('visits.diagnosis') },
  { accessorKey: 'notes', header: t('visits.notes') },
])
</script>

<template>
  <div>
    <UButton :to="props.backTo" color="neutral" variant="ghost" icon="i-lucide-arrow-left" :label="t('common.back')" class="-ml-2 mb-4" />
    <ErrorState v-if="error" :error="error" @retry="load" />
    <div v-else class="grid gap-6 xl:grid-cols-[340px_1fr]">
      <UCard>
        <div v-if="loading" class="space-y-3">
          <USkeleton class="mx-auto size-20 rounded-full" />
          <USkeleton v-for="i in 6" :key="i" class="h-6" />
        </div>
        <div v-else-if="patient">
          <div class="flex flex-col items-center text-center">
            <UAvatar :src="patient.avatar ?? undefined" :alt="personName(patient)" size="3xl" class="size-20" />
            <p class="mt-3 text-lg font-semibold text-highlighted">{{ personName(patient, true) }}</p>
            <UBadge color="primary" variant="soft" class="mt-1 font-mono">{{ patient.patientCode }}</UBadge>
          </div>
          <div class="mt-5 divide-y divide-default">
            <InfoRow :label="t('person.phone')" :value="patient.phone" icon="i-lucide-phone" />
            <InfoRow :label="t('person.birthDate')" icon="i-lucide-cake">
              {{ formatDate(patient.birthDate) }}
              <span v-if="age(patient.birthDate) !== null" class="text-muted">({{ t('patients.years', { n: age(patient.birthDate) }) }})</span>
            </InfoRow>
            <InfoRow :label="t('person.gender')" :value="labels.gender(patient.gender)" icon="i-lucide-venus-and-mars" />
            <InfoRow :label="t('person.passport')" :value="patient.passport" icon="i-lucide-id-card" />
            <InfoRow :label="t('person.email')" :value="patient.email" icon="i-lucide-mail" />
            <InfoRow :label="t('person.profession')" :value="patient.profession" icon="i-lucide-briefcase" />
            <InfoRow :label="t('person.address')" :value="patient.address" icon="i-lucide-map-pin" />
            <InfoRow :label="t('common.createdAt')" :value="formatDateTime(patient.createdAt)" icon="i-lucide-calendar" />
          </div>
          <div v-if="!props.readonly" class="mt-5 grid grid-cols-2 gap-2">
            <UButton color="neutral" variant="outline" icon="i-lucide-pencil" :label="t('common.edit')" block @click="editOpen = true" />
            <UButton :to="{ path: '/registrar/checkout', query: { patient: patient.id } }" icon="i-lucide-clipboard-plus" :label="t('patients.newVisit')" block />
          </div>
        </div>
      </UCard>

      <div class="min-w-0">
        <UTabs v-model="tab" :items="tabs" variant="link" :content="false" class="mb-4" />
        <div v-if="loading" class="space-y-2">
          <USkeleton v-for="i in 5" :key="i" class="h-12" />
        </div>
        <template v-else-if="history">
          <DataTable v-if="tab === 'payments'" :data="history.payments" :columns="paymentColumns" :paginate="false" :row-clickable="!props.readonly" @row-click="(p) => (selectedPayment = p.id)">
            <template #receiptNumber-cell="{ row }">
              <span class="font-mono text-xs">{{ row.original.receiptNumber }}</span>
            </template>
            <template #createdAt-cell="{ row }">{{ formatDateTime(row.original.createdAt) }}</template>
            <template #services-cell="{ row }">
              <span class="line-clamp-2 max-w-72">{{ row.original.items.map((i) => i.serviceName).join(', ') }}</span>
            </template>
            <template #totalAmount-cell="{ row }"><MoneyText :value="row.original.totalAmount" /></template>
            <template #method-cell="{ row }">{{ labels.paymentMethod(row.original.method) }}</template>
            <template #status-cell="{ row }"><StatusBadge kind="payment" :value="row.original.status" /></template>
          </DataTable>
          <DataTable v-else-if="tab === 'tickets'" :data="history.tickets" :columns="ticketColumns" :paginate="false">
            <template #ticketNumber-cell="{ row }">
              <span class="font-mono text-base font-bold text-highlighted">{{ row.original.ticketNumber }}</span>
            </template>
            <template #queueDate-cell="{ row }">{{ formatDate(row.original.queueDate) }}</template>
            <template #doctor-cell="{ row }">
              {{ doctorName(row.original.doctor) }}
              <span v-if="row.original.roomNumber" class="text-muted">· {{ t('queues.roomShort', { room: row.original.roomNumber }) }}</span>
            </template>
            <template #services-cell="{ row }">{{ row.original.services.map((s) => s.name).join(', ') }}</template>
            <template #status-cell="{ row }"><StatusBadge kind="queue" :value="row.original.status" /></template>
          </DataTable>
          <DataTable v-else :data="history.visits" :columns="visitColumns" :paginate="false">
            <template #startedAt-cell="{ row }">{{ formatDateTime(row.original.startedAt) }}</template>
            <template #endedAt-cell="{ row }">{{ formatDateTime(row.original.endedAt) }}</template>
            <template #complaint-cell="{ row }"><span class="line-clamp-2">{{ row.original.complaint ?? '—' }}</span></template>
            <template #diagnosis-cell="{ row }"><span class="line-clamp-2">{{ row.original.diagnosis ?? '—' }}</span></template>
            <template #notes-cell="{ row }"><span class="line-clamp-2">{{ row.original.notes ?? '—' }}</span></template>
          </DataTable>
        </template>
      </div>
    </div>
    <PatientFormSlideover v-if="!props.readonly" v-model:open="editOpen" :patient="patient" @saved="(p) => (patient = p)" />
    <PaymentDetailSlideover v-if="!props.readonly" :payment-id="selectedPayment" @close="selectedPayment = null" @changed="load" />
  </div>
</template>
