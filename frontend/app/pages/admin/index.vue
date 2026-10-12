<script setup lang="ts">
import type { DashboardStats, ReportPeriod, RevenuePoint } from '~/types/api'
import { ApiError } from '~/utils/api-error'

definePageMeta({ roles: ['ADMIN'], titleKey: 'nav.dashboard' })

const { t } = useI18n()
const api = useApi()
const { format } = useMoney()
const { formatDate, daysAgo, isoDate } = useDate()
const charts = useReportCharts()
const realtime = useRealtime()
const labels = useLabels()

const stats = ref<DashboardStats | null>(null)
const loading = ref(true)
const error = ref<ApiError | null>(null)

async function load(silent = false) {
  if (!silent) loading.value = true
  error.value = null
  try {
    stats.value = await api.get<DashboardStats>('/reports/dashboard')
  } catch (e) {
    if (!silent) error.value = e instanceof ApiError ? e : new ApiError(0, 'NETWORK_ERROR', String(e))
  } finally {
    loading.value = false
  }
}

// Revenue trend switcher
const period = ref<ReportPeriod>('daily')
const periodItems = computed(() => (['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => ({ label: t(`reports.period.${p}`), value: p })))
const periodRange: Record<ReportPeriod, number> = { daily: 29, weekly: 7 * 12, monthly: 365, yearly: 365 * 5 }
const trend = ref<RevenuePoint[]>([])
const trendLoading = ref(false)
async function loadTrend() {
  trendLoading.value = true
  try {
    trend.value = await api.get<RevenuePoint[]>('/reports/revenue', { period: period.value, dateFrom: daysAgo(periodRange[period.value]), dateTo: isoDate() })
  } catch {
    trend.value = []
  } finally {
    trendLoading.value = false
  }
}
watch(period, loadTrend)

onMounted(() => {
  void load()
  void loadTrend()
})

// Realtime: refresh KPIs when queues / payments change (throttled)
const refreshSoon = useThrottleFn(() => load(true), 3000, true)
realtime.on('queue:updated', () => refreshSoon())
realtime.on('payment:updated', () => refreshSoon())
realtime.on('kiosk:new', () => refreshSoon())

const today = computed(() => stats.value?.today)
const kpis = computed(() => {
  const s = today.value
  return [
    { label: t('dashboard.patientsToday'), value: s?.patients ?? 0, icon: 'i-lucide-users', color: 'primary' as const, hint: t('dashboard.newPatients', { n: s?.newPatients ?? 0 }), to: '/admin/patients' },
    { label: t('dashboard.servicesToday'), value: s?.services ?? 0, icon: 'i-lucide-clipboard-check', color: 'secondary' as const, to: '/admin/reports' },
    { label: t('dashboard.paymentsToday'), value: s?.payments ?? 0, icon: 'i-lucide-receipt', color: 'info' as const, to: '/admin/payments' },
    { label: t('dashboard.revenueToday'), value: format(s?.revenue.total ?? 0), icon: 'i-lucide-wallet', color: 'success' as const, hint: s?.revenue.debt ? t('dashboard.debt', { amount: format(s.revenue.debt) }) : undefined },
    { label: t('dashboard.waiting'), value: s?.waiting ?? 0, icon: 'i-lucide-hourglass', color: 'warning' as const, hint: t('dashboard.inProgress', { n: s?.inProgress ?? 0 }), to: '/admin/queues' },
    { label: t('dashboard.activeDoctors'), value: s?.activeDoctors ?? 0, icon: 'i-lucide-stethoscope', color: 'neutral' as const, hint: t('dashboard.completed', { n: s?.completed ?? 0 }), to: '/admin/doctors' },
  ]
})

const revenueRows = computed(() => {
  const r = today.value?.revenue
  return [
    { key: 'CASH' as const, amount: r?.cash ?? 0 },
    { key: 'CARD' as const, amount: r?.card ?? 0 },
    { key: 'CONTRACT' as const, amount: r?.contract ?? 0 },
  ]
})

const dayLabel = (p: string) => (/^\d{4}-\d{2}-\d{2}$/.test(p) ? formatDate(p).slice(0, 5) : p)
const last30 = computed(() => charts.revenue(stats.value?.revenueLast30Days ?? [], dayLabel))
const trendOption = computed(() => charts.revenue(trend.value, dayLabel))
const methodsOption = computed(() => charts.methods(stats.value?.paymentMethods ?? []))
const servicesOption = computed(() => charts.topServices(stats.value?.topServices ?? []))
const doctorsOption = computed(() => charts.doctors(stats.value?.doctors ?? []))
const departmentsOption = computed(() => charts.departments(stats.value?.departments ?? []))
</script>

<template>
  <AppPage :title="t('nav.dashboard')" :description="t('dashboard.subtitle', { date: formatDate(isoDate()) })">
    <template #actions>
      <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="loading" :label="t('common.refresh')" @click="load()" />
      <UButton to="/admin/reports" icon="i-lucide-chart-column" :label="t('nav.reports')" />
    </template>

    <ErrorState v-if="error" :error="error" @retry="load()" />
    <div v-else class="space-y-6">
      <UAlert
        v-if="today && today.pendingKioskRequests > 0"
        color="info"
        variant="subtle"
        icon="i-lucide-inbox"
        :title="t('dashboard.pendingRequests', { n: today.pendingKioskRequests })"
        :actions="[{ label: t('common.open'), to: '/registrar', color: 'info', variant: 'solid' }]"
      />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard v-for="k in kpis" :key="k.label" v-bind="k" :loading="loading" />
      </div>

      <div class="grid gap-6 xl:grid-cols-3">
        <ChartCard
          class="xl:col-span-2"
          :title="t('dashboard.revenue30')"
          :option="last30"
          :loading="loading"
          :empty="!stats?.revenueLast30Days.length"
        />
        <PageSection :title="t('dashboard.todayRevenue')" icon="i-lucide-wallet">
          <div v-if="loading" class="space-y-3">
            <USkeleton v-for="i in 4" :key="i" class="h-10" />
          </div>
          <div v-else class="space-y-3">
            <div v-for="row in revenueRows" :key="row.key" class="flex items-center justify-between rounded-lg bg-elevated/50 px-3 py-2.5">
              <span class="flex items-center gap-2 text-sm">
                <UIcon :name="PAYMENT_METHOD_ICON[row.key]" class="size-4 text-muted" />
                {{ labels.paymentMethod(row.key) }}
              </span>
              <MoneyText :value="row.amount" class="font-medium" />
            </div>
            <USeparator />
            <div class="flex items-center justify-between px-3">
              <span class="font-semibold text-highlighted">{{ t('common.total') }}</span>
              <MoneyText :value="today?.revenue.total ?? 0" class="text-lg font-bold text-primary" />
            </div>
            <div v-if="today?.revenue.refunded" class="flex items-center justify-between px-3 text-sm text-muted">
              <span>{{ t('dashboard.refunded') }}</span>
              <MoneyText :value="today.revenue.refunded" />
            </div>
          </div>
        </PageSection>
      </div>

      <ChartCard :title="t('dashboard.revenueTrend')" :option="trendOption" :loading="trendLoading" :empty="!trend.length">
        <template #actions>
          <UTabs v-model="period" :items="periodItems" size="xs" :content="false" />
        </template>
      </ChartCard>

      <div class="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        <ChartCard :title="t('dashboard.paymentMethods')" :description="t('dashboard.thisMonth')" :option="methodsOption" :loading="loading" :empty="!stats?.paymentMethods.some((m) => m.amount > 0)" />
        <ChartCard :title="t('dashboard.topServices')" :description="t('dashboard.thisMonth')" :option="servicesOption" :loading="loading" :empty="!stats?.topServices.length" />
        <ChartCard :title="t('dashboard.byDepartments')" :description="t('dashboard.thisMonth')" :option="departmentsOption" :loading="loading" :empty="!stats?.departments.length" />
        <ChartCard class="lg:col-span-2 2xl:col-span-3" :title="t('dashboard.byDoctors')" :description="t('dashboard.thisMonth')" :option="doctorsOption" :loading="loading" :empty="!stats?.doctors.length" height="340px" />
      </div>
    </div>
  </AppPage>
</template>
