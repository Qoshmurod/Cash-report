<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type {
  DepartmentStat,
  DoctorStat,
  PageMeta,
  Patient,
  Payment,
  QueueReportSummary,
  QueueTicket,
  ReportPeriod,
  ReportType,
  RevenuePoint,
  RevenueSummary,
  ServiceStat,
} from '~/types/api'
import type { QueryParams } from '~/composables/useApi'
import { ApiError } from '~/utils/api-error'

definePageMeta({ roles: ['ADMIN'], titleKey: 'nav.reports' })

type Tab = 'payments' | 'services' | 'doctors' | 'departments' | 'queues' | 'patients'

const { t } = useI18n()
const api = useApi()
const route = useRoute()
const router = useRouter()
const labels = useLabels()
const charts = useReportCharts()
const lookups = useLookupOptions()
const { format } = useMoney()
const { formatDate, formatDateTime, startOfMonth, isoDate, age } = useDate()

const TABS: Tab[] = ['payments', 'services', 'doctors', 'departments', 'queues', 'patients']
const initialTab = TABS.includes(route.query.tab as Tab) ? (route.query.tab as Tab) : 'payments'
const tab = ref<Tab>(initialTab)
const tabItems = computed(() => [
  { value: 'payments', label: t('reports.tabs.payments'), icon: 'i-lucide-wallet' },
  { value: 'services', label: t('reports.tabs.services'), icon: 'i-lucide-clipboard-list' },
  { value: 'doctors', label: t('reports.tabs.doctors'), icon: 'i-lucide-stethoscope' },
  { value: 'departments', label: t('reports.tabs.departments'), icon: 'i-lucide-building-2' },
  { value: 'queues', label: t('reports.tabs.queues'), icon: 'i-lucide-list-ordered' },
  { value: 'patients', label: t('reports.tabs.patients'), icon: 'i-lucide-users' },
])

const filters = reactive<{
  dateFrom: string
  dateTo: string
  doctorId: string | undefined
  serviceId: string | undefined
  departmentId: string | undefined
  method: string | undefined
  status: string | undefined
}>({ dateFrom: startOfMonth(), dateTo: isoDate(), doctorId: undefined, serviceId: undefined, departmentId: undefined, method: undefined, status: undefined })
const page = ref(1)
const limit = ref(20)

const showFilter = computed(() => ({
  doctor: ['payments', 'queues'].includes(tab.value),
  service: tab.value === 'payments',
  department: ['payments', 'services', 'queues'].includes(tab.value),
  method: tab.value === 'payments',
  paymentStatus: tab.value === 'payments',
  queueStatus: tab.value === 'queues',
}))

const query = computed<QueryParams>(() => {
  const q: QueryParams = { dateFrom: filters.dateFrom, dateTo: filters.dateTo }
  if (showFilter.value.doctor) q.doctorId = filters.doctorId
  if (showFilter.value.service) q.serviceId = filters.serviceId
  if (showFilter.value.department) q.departmentId = filters.departmentId
  if (showFilter.value.method) q.method = filters.method
  if (showFilter.value.paymentStatus || showFilter.value.queueStatus) q.status = filters.status
  return q
})

// ReportType has no department export (contract §2) — the export menu is hidden on that tab
const exportType = computed<ReportType | null>(() => (tab.value === 'departments' ? null : tab.value))

// ─── Data ───
const loading = ref(false)
const error = ref<ApiError | null>(null)
const meta = ref<PageMeta | undefined>()
const payments = ref<Payment[]>([])
const paymentSummary = ref<RevenueSummary | null>(null)
const revenue = ref<RevenuePoint[]>([])
const period = ref<ReportPeriod>('daily')
const services = ref<ServiceStat[]>([])
const doctors = ref<DoctorStat[]>([])
const departments = ref<DepartmentStat[]>([])
const tickets = ref<QueueTicket[]>([])
const queueSummary = ref<QueueReportSummary | null>(null)
const patients = ref<Patient[]>([])

async function load() {
  loading.value = true
  error.value = null
  const q = query.value
  const paged = { ...q, page: page.value, limit: limit.value }
  try {
    switch (tab.value) {
      case 'payments': {
        const [res, rev] = await Promise.all([
          api.request<{ items: Payment[]; summary: RevenueSummary }>('/reports/payments', { query: paged }),
          api.get<RevenuePoint[]>('/reports/revenue', { period: period.value, dateFrom: q.dateFrom, dateTo: q.dateTo }),
        ])
        payments.value = res.data.items
        paymentSummary.value = res.data.summary
        meta.value = res.meta
        revenue.value = rev
        break
      }
      case 'services':
        services.value = await api.get<ServiceStat[]>('/reports/services', q)
        break
      case 'doctors':
        doctors.value = await api.get<DoctorStat[]>('/reports/doctors', q)
        break
      case 'departments':
        departments.value = await api.get<DepartmentStat[]>('/reports/departments', q)
        break
      case 'queues': {
        const res = await api.request<{ items: QueueTicket[]; summary: QueueReportSummary }>('/reports/queues', { query: paged })
        tickets.value = res.data.items
        queueSummary.value = res.data.summary
        meta.value = res.meta
        break
      }
      case 'patients': {
        const res = await api.list<Patient>('/patients', { page: page.value, limit: limit.value, dateFrom: q.dateFrom, dateTo: q.dateTo })
        patients.value = res.data
        meta.value = res.meta
        break
      }
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e : new ApiError(0, 'NETWORK_ERROR', String(e))
  } finally {
    loading.value = false
  }
}

watch(tab, (v) => {
  page.value = 1
  filters.status = undefined
  void router.replace({ query: { ...route.query, tab: v } })
  void load()
})
watch(query, () => {
  page.value = 1
  void load()
})
watch([page, limit, period], () => void load())
onMounted(() => {
  void load()
  void Promise.all([lookups.store.loadDepartments(), lookups.store.loadDoctors(), lookups.store.loadServices()]).catch(() => undefined)
})

function preset(kind: 'today' | 'week' | 'month' | 'year') {
  const today = isoDate()
  filters.dateTo = today
  if (kind === 'today') filters.dateFrom = today
  if (kind === 'week') filters.dateFrom = isoDate(new Date(Date.now() - 6 * 86_400_000))
  if (kind === 'month') filters.dateFrom = startOfMonth()
  if (kind === 'year') filters.dateFrom = `${today.slice(0, 4)}-01-01`
}

// ─── Charts / columns ───
const periodItems = computed(() => (['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => ({ label: t(`reports.period.${p}`), value: p })))
const revenueOption = computed(() => charts.revenue(revenue.value, (p) => (/^\d{4}-\d{2}-\d{2}$/.test(p) ? formatDate(p).slice(0, 5) : p)))
const servicesOption = computed(() => charts.horizontalBar(services.value.slice(0, 15).map((s) => ({ name: s.name, value: s.amount })), t('reports.amount'), true))
const doctorsOption = computed(() => charts.horizontalBar(doctors.value.slice(0, 15).map((d) => ({ name: d.name, value: d.amount })), t('reports.amount'), true))
const departmentsOption = computed(() => charts.departments(departments.value))

const paymentColumns = computed<TableColumn<Payment>[]>(() => [
  { accessorKey: 'createdAt', header: t('common.date') },
  { accessorKey: 'receiptNumber', header: t('payments.receipt') },
  { id: 'patient', header: t('payments.patient') },
  { id: 'services', header: t('payments.services') },
  { accessorKey: 'totalAmount', header: t('common.total') },
  { accessorKey: 'paidAmount', header: t('payments.paid') },
  { accessorKey: 'method', header: t('payments.method') },
  { accessorKey: 'status', header: t('common.status') },
])
const serviceColumns = computed<TableColumn<ServiceStat>[]>(() => [
  { accessorKey: 'name', header: t('services.name') },
  { accessorKey: 'code', header: t('services.code') },
  { accessorKey: 'departmentName', header: t('services.department') },
  { accessorKey: 'count', header: t('reports.count') },
  { accessorKey: 'amount', header: t('reports.amount') },
])
const doctorColumns = computed<TableColumn<DoctorStat>[]>(() => [
  { accessorKey: 'name', header: t('queues.doctor') },
  { accessorKey: 'specialty', header: t('doctor.specialty') },
  { accessorKey: 'roomNumber', header: t('doctor.room') },
  { accessorKey: 'servicesCount', header: t('reports.servicesCount') },
  { accessorKey: 'patientsServed', header: t('reports.patientsServed') },
  { accessorKey: 'amount', header: t('reports.amount') },
])
const departmentColumns = computed<TableColumn<DepartmentStat>[]>(() => [
  { accessorKey: 'name', header: t('departments.name') },
  { accessorKey: 'servicesCount', header: t('reports.servicesCount') },
  { accessorKey: 'patients', header: t('reports.patients') },
  { accessorKey: 'amount', header: t('reports.amount') },
])
const ticketColumns = computed<TableColumn<QueueTicket>[]>(() => [
  { accessorKey: 'queueDate', header: t('common.date') },
  { accessorKey: 'ticketNumber', header: t('queues.ticket') },
  { id: 'patient', header: t('queues.patient') },
  { id: 'doctor', header: t('queues.doctor') },
  { accessorKey: 'status', header: t('common.status') },
  { id: 'wait', header: t('reports.waitMinutes') },
])
const patientColumns = computed<TableColumn<Patient>[]>(() => [
  { accessorKey: 'patientCode', header: t('patients.code') },
  { id: 'name', header: t('patients.patient') },
  { accessorKey: 'phone', header: t('person.phone') },
  { accessorKey: 'birthDate', header: t('person.birthDate') },
  { accessorKey: 'gender', header: t('person.gender') },
  { accessorKey: 'createdAt', header: t('common.createdAt') },
])

const sum = <T,>(rows: T[], pick: (r: T) => number) => rows.reduce((a, r) => a + pick(r), 0)
const minutes = (from: string | null, to: string | null) => (from && to ? Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000) : null)
</script>

<template>
  <AppPage :title="t('nav.reports')" :description="t('reports.subtitle')">
    <div class="mb-4 overflow-x-auto">
      <UTabs v-model="tab" :items="tabItems" :content="false" class="w-max" />
    </div>

    <UCard class="mb-6" :ui="{ body: 'p-4' }">
      <div class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div class="flex flex-wrap items-end gap-3">
          <UFormField :label="t('common.dateFrom')">
            <UInput v-model="filters.dateFrom" type="date" />
          </UFormField>
          <UFormField :label="t('common.dateTo')">
            <UInput v-model="filters.dateTo" type="date" />
          </UFormField>
          <UFieldGroup>
            <UButton color="neutral" variant="outline" :label="t('reports.presets.today')" @click="preset('today')" />
            <UButton color="neutral" variant="outline" :label="t('reports.presets.week')" @click="preset('week')" />
            <UButton color="neutral" variant="outline" :label="t('reports.presets.month')" @click="preset('month')" />
            <UButton color="neutral" variant="outline" :label="t('reports.presets.year')" @click="preset('year')" />
          </UFieldGroup>
          <UFormField v-if="showFilter.department" :label="t('services.department')">
            <FilterSelect v-model="filters.departmentId" :items="lookups.departmentOptions.value" />
          </UFormField>
          <UFormField v-if="showFilter.doctor" :label="t('queues.doctor')">
            <FilterSelect v-model="filters.doctorId" :items="lookups.doctorOptions.value" />
          </UFormField>
          <UFormField v-if="showFilter.service" :label="t('reports.service')">
            <FilterSelect v-model="filters.serviceId" :items="lookups.serviceOptions.value" />
          </UFormField>
          <UFormField v-if="showFilter.method" :label="t('payments.method')">
            <FilterSelect v-model="filters.method" :items="labels.paymentMethodOptions.value" />
          </UFormField>
          <UFormField v-if="showFilter.paymentStatus" :label="t('common.status')">
            <FilterSelect v-model="filters.status" :items="labels.paymentStatusOptions.value" />
          </UFormField>
          <UFormField v-if="showFilter.queueStatus" :label="t('common.status')">
            <FilterSelect v-model="filters.status" :items="labels.queueStatusOptions.value" />
          </UFormField>
        </div>
        <ExportMenu v-if="exportType" :type="exportType" :query="query" />
      </div>
    </UCard>

    <ErrorState v-if="error" :error="error" @retry="load" />

    <!-- Payments -->
    <div v-else-if="tab === 'payments'" class="space-y-6">
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard :label="t('enums.paymentMethod.CASH')" :value="format(paymentSummary?.cash ?? 0)" icon="i-lucide-banknote" color="primary" :loading="loading" />
        <StatCard :label="t('enums.paymentMethod.CARD')" :value="format(paymentSummary?.card ?? 0)" icon="i-lucide-credit-card" color="info" :loading="loading" />
        <StatCard :label="t('enums.paymentMethod.CONTRACT')" :value="format(paymentSummary?.contract ?? 0)" icon="i-lucide-file-signature" color="secondary" :loading="loading" />
        <StatCard :label="t('reports.totalRevenue')" :value="format(paymentSummary?.total ?? 0)" icon="i-lucide-wallet" color="success" :loading="loading" />
        <StatCard :label="t('dashboard.refunded')" :value="format(paymentSummary?.refunded ?? 0)" icon="i-lucide-undo-2" color="warning" :loading="loading" />
        <StatCard :label="t('reports.debt')" :value="format(paymentSummary?.debt ?? 0)" icon="i-lucide-hourglass" color="error" :hint="t('reports.paymentsCount', { n: paymentSummary?.count ?? 0 })" :loading="loading" />
      </div>
      <ChartCard :title="t('reports.revenueDynamics')" :option="revenueOption" :loading="loading" :empty="!revenue.length">
        <template #actions>
          <UTabs v-model="period" :items="periodItems" size="xs" :content="false" />
        </template>
      </ChartCard>
      <DataTable v-model:page="page" v-model:limit="limit" :data="payments" :columns="paymentColumns" :loading="loading" :meta="meta" empty-icon="i-lucide-wallet">
        <template #createdAt-cell="{ row }"><span class="tabular">{{ formatDateTime(row.original.createdAt) }}</span></template>
        <template #receiptNumber-cell="{ row }"><span class="font-mono text-xs">{{ row.original.receiptNumber }}</span></template>
        <template #patient-cell="{ row }">{{ personName(row.original.patient) }}</template>
        <template #services-cell="{ row }"><span class="line-clamp-2 max-w-64 text-muted">{{ row.original.items.map((i) => i.serviceName).join(', ') }}</span></template>
        <template #totalAmount-cell="{ row }"><MoneyText :value="row.original.totalAmount" /></template>
        <template #paidAmount-cell="{ row }"><MoneyText :value="row.original.paidAmount" /></template>
        <template #method-cell="{ row }">{{ labels.paymentMethod(row.original.method) }}</template>
        <template #status-cell="{ row }"><StatusBadge kind="payment" :value="row.original.status" /></template>
      </DataTable>
    </div>

    <!-- Services -->
    <div v-else-if="tab === 'services'" class="space-y-6">
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard :label="t('reports.servicesCount')" :value="sum(services, (s) => s.count)" icon="i-lucide-clipboard-check" :loading="loading" />
        <StatCard :label="t('reports.totalRevenue')" :value="format(sum(services, (s) => s.amount))" icon="i-lucide-wallet" color="success" :loading="loading" />
        <StatCard :label="t('reports.distinctServices')" :value="services.length" icon="i-lucide-list" color="info" :loading="loading" />
      </div>
      <ChartCard :title="t('reports.servicesByRevenue')" :option="servicesOption" :loading="loading" :empty="!services.length" height="420px" />
      <DataTable :data="services" :columns="serviceColumns" :loading="loading" :paginate="false">
        <template #code-cell="{ row }"><UBadge color="neutral" variant="soft" class="font-mono">{{ row.original.code }}</UBadge></template>
        <template #amount-cell="{ row }"><MoneyText :value="row.original.amount" class="font-medium" /></template>
      </DataTable>
    </div>

    <!-- Doctors -->
    <div v-else-if="tab === 'doctors'" class="space-y-6">
      <ChartCard :title="t('reports.doctorsByRevenue')" :option="doctorsOption" :loading="loading" :empty="!doctors.length" height="380px" />
      <DataTable :data="doctors" :columns="doctorColumns" :loading="loading" :paginate="false">
        <template #roomNumber-cell="{ row }"><span class="font-mono font-semibold">{{ row.original.roomNumber }}</span></template>
        <template #amount-cell="{ row }"><MoneyText :value="row.original.amount" class="font-medium" /></template>
      </DataTable>
    </div>

    <!-- Departments -->
    <div v-else-if="tab === 'departments'" class="grid gap-6 xl:grid-cols-2">
      <ChartCard :title="t('reports.departmentsShare')" :option="departmentsOption" :loading="loading" :empty="!departments.length" height="380px" />
      <DataTable :data="departments" :columns="departmentColumns" :loading="loading" :paginate="false">
        <template #amount-cell="{ row }"><MoneyText :value="row.original.amount" class="font-medium" /></template>
      </DataTable>
    </div>

    <!-- Queues -->
    <div v-else-if="tab === 'queues'" class="space-y-6">
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4 2xl:grid-cols-8">
        <StatCard v-for="s in (['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED'] as const)" :key="s" :label="labels.queueStatus(s)" :value="queueSummary?.[s] ?? 0" icon="i-lucide-ticket" :color="QUEUE_STATUS_COLOR[s]" :loading="loading" />
        <StatCard :label="t('reports.avgWait')" :value="queueSummary?.avgWaitMinutes != null ? t('services.minutes', { n: Math.round(queueSummary.avgWaitMinutes) }) : '—'" icon="i-lucide-hourglass" color="warning" :loading="loading" />
        <StatCard :label="t('reports.avgService')" :value="queueSummary?.avgServiceMinutes != null ? t('services.minutes', { n: Math.round(queueSummary.avgServiceMinutes) }) : '—'" icon="i-lucide-timer" color="primary" :loading="loading" />
      </div>
      <DataTable v-model:page="page" v-model:limit="limit" :data="tickets" :columns="ticketColumns" :loading="loading" :meta="meta" empty-icon="i-lucide-list-ordered">
        <template #queueDate-cell="{ row }">{{ formatDate(row.original.queueDate) }}</template>
        <template #ticketNumber-cell="{ row }"><span class="font-mono font-bold">{{ row.original.ticketNumber }}</span></template>
        <template #patient-cell="{ row }">{{ personName(row.original.patient) }}</template>
        <template #doctor-cell="{ row }">{{ doctorName(row.original.doctor) }}</template>
        <template #status-cell="{ row }"><StatusBadge kind="queue" :value="row.original.status" /></template>
        <template #wait-cell="{ row }">{{ minutes(row.original.createdAt, row.original.calledAt) ?? '—' }}</template>
      </DataTable>
    </div>

    <!-- Patients -->
    <div v-else class="space-y-6">
      <DataTable v-model:page="page" v-model:limit="limit" :data="patients" :columns="patientColumns" :loading="loading" :meta="meta" empty-icon="i-lucide-users">
        <template #patientCode-cell="{ row }"><UBadge color="neutral" variant="soft" class="font-mono">{{ row.original.patientCode }}</UBadge></template>
        <template #name-cell="{ row }">{{ personName(row.original, true) }}</template>
        <template #birthDate-cell="{ row }">
          {{ formatDate(row.original.birthDate) }}
          <span v-if="age(row.original.birthDate) !== null" class="text-xs text-muted">({{ age(row.original.birthDate) }})</span>
        </template>
        <template #gender-cell="{ row }">{{ labels.gender(row.original.gender) }}</template>
        <template #createdAt-cell="{ row }">{{ formatDateTime(row.original.createdAt) }}</template>
      </DataTable>
    </div>
  </AppPage>
</template>
