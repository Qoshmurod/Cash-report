<script setup lang="ts">
import type { Doctor, QueueTicket } from '~/types/api'
import { ApiError } from '~/utils/api-error'
import { DOCTOR_POLL_MS } from '~/utils/constants'

definePageMeta({ roles: ['DOCTOR'], titleKey: 'nav.cabinet' })

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const realtime = useRealtime()
const auth = useAuthStore()
const { confirm } = useConfirm()
const { formatTime, minutesBetween, age } = useDate()
const labels = useLabels()

const doctor = ref<Doctor | null>(null)
const tickets = ref<QueueTicket[]>([])
const loading = ref(true)
const error = ref<ApiError | null>(null)
const busyId = ref<string | null>(null)
const now = useNow({ scheduler: (cb) => useIntervalFn(cb, 30_000) })

async function loadDoctor() {
  doctor.value = await api.get<Doctor>('/doctors/me')
}
async function loadQueue(silent = false) {
  if (!silent) loading.value = true
  try {
    tickets.value = await api.get<QueueTicket[]>('/queues/my')
    error.value = null
  } catch (e) {
    if (!silent) error.value = e instanceof ApiError ? e : new ApiError(0, 'NETWORK_ERROR', String(e))
  } finally {
    loading.value = false
  }
}
async function loadAll() {
  loading.value = true
  error.value = null
  try {
    await Promise.all([loadDoctor(), loadQueue(true)])
  } catch (e) {
    error.value = e instanceof ApiError ? e : new ApiError(0, 'NETWORK_ERROR', String(e))
  } finally {
    loading.value = false
  }
}
onMounted(loadAll)

const refreshSoon = useThrottleFn(() => loadQueue(true), 1000, true)
realtime.on('queue:updated', (e) => {
  if (!doctor.value || e.doctorId === doctor.value.id || e.doctorId === null) refreshSoon()
})
realtime.onReconnect(() => void loadQueue(true))
useIntervalFn(() => void loadQueue(true), DOCTOR_POLL_MS)

const current = computed(() => tickets.value.find((tk) => tk.status === 'IN_PROGRESS') ?? tickets.value.find((tk) => tk.status === 'CALLED') ?? null)
const waiting = computed(() => tickets.value.filter((tk) => tk.status === 'WAITING').sort((a, b) => a.sequence - b.sequence))
const skipped = computed(() => tickets.value.filter((tk) => tk.status === 'SKIPPED'))
const completedCount = computed(() => tickets.value.filter((tk) => tk.status === 'COMPLETED').length)
const hasActive = computed(() => tickets.value.some((tk) => tk.status === 'IN_PROGRESS'))
const avgMinutes = computed(() => {
  const done = tickets.value.filter((tk) => tk.status === 'COMPLETED' && tk.startedAt && tk.completedAt)
  if (!done.length) return null
  return Math.round(done.reduce((s, tk) => s + (minutesBetween(tk.startedAt, tk.completedAt) ?? 0), 0) / done.length)
})
const waitedFor = (tk: QueueTicket) => {
  void now.value
  return minutesBetween(tk.createdAt) ?? 0
}

async function run(tk: QueueTicket, action: 'call' | 'start' | 'skip' | 'requeue', successKey: string, body?: unknown) {
  busyId.value = tk.id
  try {
    await api.post<QueueTicket>(`/queues/${tk.id}/${action}`, body)
    toast.add({ title: t(successKey, { n: tk.ticketNumber }), color: 'success', icon: 'i-lucide-check' })
    await loadQueue(true)
  } finally {
    busyId.value = null
  }
}

const call = (tk: QueueTicket) => run(tk, 'call', 'toast.ticketCalled')
const start = (tk: QueueTicket) => run(tk, 'start', 'toast.visitStarted')
const requeue = (tk: QueueTicket) => run(tk, 'requeue', 'toast.ticketRequeued')
async function skip(tk: QueueTicket) {
  const r = await confirm({ title: t('doctorCabinet.skipTitle', { n: tk.ticketNumber }), description: t('doctorCabinet.skipDescription'), color: 'warning', icon: 'i-lucide-skip-forward', confirmLabel: t('queues.skip') })
  if (r.confirmed) await run(tk, 'skip', 'toast.ticketSkipped')
}

// Completion form
const completeOpen = ref(false)
const visit = reactive({ complaint: '', diagnosis: '', notes: '' })
function openComplete() {
  Object.assign(visit, { complaint: '', diagnosis: '', notes: '' })
  completeOpen.value = true
}
async function complete() {
  const tk = current.value
  if (!tk) return
  busyId.value = tk.id
  try {
    await api.post(`/queues/${tk.id}/complete`, {
      complaint: visit.complaint.trim() || undefined,
      diagnosis: visit.diagnosis.trim() || undefined,
      notes: visit.notes.trim() || undefined,
    })
    completeOpen.value = false
    toast.add({ title: t('toast.visitCompleted', { n: tk.ticketNumber }), color: 'success', icon: 'i-lucide-check-check' })
    await loadQueue(true)
  } finally {
    busyId.value = null
  }
}

async function callNext() {
  const next = waiting.value[0]
  if (next) await call(next)
}

async function toggleAvailability(value: boolean) {
  doctor.value = await api.patch<Doctor>('/doctors/me/availability', { isAvailable: value })
  toast.add({ title: value ? t('toast.doctorAvailable') : t('toast.doctorUnavailable'), color: 'success', icon: 'i-lucide-check' })
}

defineShortcuts({
  n: () => {
    if (!current.value && waiting.value.length) void callNext()
  },
})
</script>

<template>
  <AppPage :title="t('nav.cabinet')">
    <ErrorState v-if="error" :error="error" @retry="loadAll" />
    <div v-else class="space-y-6">
      <!-- Doctor header -->
      <div class="overflow-hidden rounded-2xl border border-default bg-gradient-to-r from-primary-600 to-sky-600 text-white">
        <div class="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div class="flex items-center gap-4">
            <UAvatar :src="auth.user?.avatar ?? undefined" :alt="auth.fullName" size="3xl" class="ring-4 ring-white/20" />
            <div>
              <p class="text-sm text-white/75">{{ t('doctorCabinet.greeting') }}</p>
              <p class="text-xl font-semibold sm:text-2xl">{{ auth.fullName }}</p>
              <p class="text-white/80">{{ doctor?.specialty }}</p>
            </div>
          </div>
          <div class="flex items-center gap-6">
            <div class="text-center">
              <p class="text-xs uppercase tracking-widest text-white/70">{{ t('doctor.room') }}</p>
              <p class="font-mono text-4xl font-black">{{ doctor?.roomNumber ?? '—' }}</p>
            </div>
            <div class="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/20">
              <USwitch
                :model-value="doctor?.isAvailable ?? false"
                :label="doctor?.isAvailable ? t('doctor.available') : t('doctor.unavailable')"
                color="success"
                :ui="{ label: 'text-white font-medium' }"
                @update:model-value="toggleAvailability"
              />
            </div>
          </div>
        </div>
        <div class="grid grid-cols-3 divide-x divide-white/15 border-t border-white/15 bg-black/10 text-center">
          <div class="p-3"><p class="text-2xl font-bold tabular">{{ waiting.length }}</p><p class="text-xs text-white/75">{{ t('doctorCabinet.waiting') }}</p></div>
          <div class="p-3"><p class="text-2xl font-bold tabular">{{ completedCount }}</p><p class="text-xs text-white/75">{{ t('doctorCabinet.completedToday') }}</p></div>
          <div class="p-3"><p class="text-2xl font-bold tabular">{{ avgMinutes ?? '—' }}</p><p class="text-xs text-white/75">{{ t('doctorCabinet.avgMinutes') }}</p></div>
        </div>
      </div>

      <UAlert v-if="doctor && !doctor.isAvailable" color="warning" variant="subtle" icon="i-lucide-pause-circle" :title="t('doctorCabinet.unavailableHint')" />

      <div class="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <!-- Current patient -->
        <PageSection :title="t('doctorCabinet.current')" icon="i-lucide-user-round-check">
          <div v-if="loading" class="space-y-3">
            <USkeleton class="h-20" />
            <USkeleton class="h-10" />
          </div>
          <div v-else-if="current" class="space-y-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="font-mono text-5xl font-black tracking-tight text-primary">{{ current.ticketNumber }}</p>
                <p class="mt-2 text-xl font-semibold text-highlighted">{{ personName(current.patient, true) }}</p>
                <p class="text-sm text-muted">
                  {{ current.patient?.patientCode }}
                  <template v-if="current.patient?.birthDate"> · {{ t('patients.years', { n: age(current.patient.birthDate) }) }}</template>
                  <template v-if="current.patient?.gender"> · {{ labels.gender(current.patient.gender) }}</template>
                </p>
              </div>
              <div class="text-right">
                <StatusBadge kind="queue" :value="current.status" size="lg" />
                <p v-if="current.status === 'CALLED'" class="mt-2 text-xs text-muted">
                  {{ t('doctorCabinet.calledAt', { time: formatTime(current.calledAt), n: current.calledCount }) }}
                </p>
                <p v-else-if="current.startedAt" class="mt-2 text-xs text-muted">{{ t('doctorCabinet.startedAt', { time: formatTime(current.startedAt) }) }}</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <UBadge v-for="s in current.services" :key="s.id" color="neutral" variant="soft">{{ s.name }}</UBadge>
            </div>
            <div class="flex flex-wrap gap-2">
              <template v-if="current.status === 'CALLED'">
                <UButton size="xl" icon="i-lucide-play" :loading="busyId === current.id" :disabled="hasActive" :label="t('queues.start')" @click="start(current)" />
                <UButton size="xl" color="neutral" variant="outline" icon="i-lucide-megaphone" :loading="busyId === current.id" :label="t('queues.recall')" @click="call(current)" />
                <UButton size="xl" color="warning" variant="soft" icon="i-lucide-user-x" :label="t('doctorCabinet.noShow')" @click="skip(current)" />
              </template>
              <template v-else>
                <UButton size="xl" color="success" icon="i-lucide-check-check" :loading="busyId === current.id" :label="t('queues.complete')" @click="openComplete" />
              </template>
              <UButton v-if="current.patient" size="xl" color="neutral" variant="ghost" icon="i-lucide-folder-open" :label="t('doctorCabinet.history')" :to="`/doctor/patient/${current.patientId}`" />
            </div>
          </div>
          <EmptyState v-else :title="t('doctorCabinet.noCurrent')" :description="waiting.length ? t('doctorCabinet.callNextHint') : t('doctorCabinet.queueEmpty')" icon="i-lucide-coffee">
            <UButton v-if="waiting.length" size="xl" icon="i-lucide-megaphone" :disabled="!doctor?.isAvailable" :label="t('doctorCabinet.callNext', { n: waiting[0]?.ticketNumber })" @click="callNext" />
          </EmptyState>
        </PageSection>

        <!-- Waiting list -->
        <PageSection :title="t('doctorCabinet.queue')" :description="t('doctorCabinet.queueHint')" icon="i-lucide-list-ordered">
          <template #actions>
            <UButton color="neutral" variant="ghost" icon="i-lucide-refresh-cw" :aria-label="t('common.refresh')" @click="loadQueue()" />
          </template>
          <div v-if="loading" class="space-y-2">
            <USkeleton v-for="i in 4" :key="i" class="h-16" />
          </div>
          <EmptyState v-else-if="!waiting.length" :title="t('doctorCabinet.queueEmpty')" icon="i-lucide-list-checks" compact />
          <ul v-else class="divide-y divide-default">
            <li v-for="(tk, i) in waiting" :key="tk.id" class="flex items-center gap-4 py-3">
              <span class="w-16 shrink-0 font-mono text-2xl font-bold" :class="i === 0 ? 'text-primary' : 'text-highlighted'">{{ tk.ticketNumber }}</span>
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium text-highlighted">{{ personName(tk.patient, true) }}</p>
                <p class="truncate text-xs text-muted">{{ tk.services.map((s) => s.name).join(', ') }} · {{ t('queues.waitingFor', { n: waitedFor(tk) }) }}</p>
              </div>
              <UButton
                :color="i === 0 ? 'primary' : 'neutral'"
                :variant="i === 0 ? 'solid' : 'outline'"
                size="lg"
                icon="i-lucide-megaphone"
                :loading="busyId === tk.id"
                :disabled="!!current || !doctor?.isAvailable"
                :label="t('queues.call')"
                @click="call(tk)"
              />
            </li>
          </ul>
        </PageSection>
      </div>

      <PageSection v-if="skipped.length" :title="t('doctorCabinet.skipped')" icon="i-lucide-skip-forward">
        <ul class="divide-y divide-default">
          <li v-for="tk in skipped" :key="tk.id" class="flex items-center gap-4 py-2.5">
            <span class="w-16 font-mono text-lg font-bold text-muted">{{ tk.ticketNumber }}</span>
            <span class="flex-1 truncate">{{ personName(tk.patient) }}</span>
            <UButton color="neutral" variant="outline" icon="i-lucide-rotate-ccw" :loading="busyId === tk.id" :label="t('queues.requeue')" @click="requeue(tk)" />
          </li>
        </ul>
      </PageSection>
    </div>

    <UModal v-model:open="completeOpen" :title="t('doctorCabinet.completeTitle', { n: current?.ticketNumber ?? '' })" :description="personName(current?.patient, true)">
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('visits.complaint')">
            <UTextarea v-model="visit.complaint" :rows="2" class="w-full" autoresize />
          </UFormField>
          <UFormField :label="t('visits.diagnosis')">
            <UTextarea v-model="visit.diagnosis" :rows="2" class="w-full" autoresize />
          </UFormField>
          <UFormField :label="t('visits.notes')">
            <UTextarea v-model="visit.notes" :rows="3" class="w-full" autoresize />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" :label="t('common.cancel')" @click="completeOpen = false" />
          <UButton color="success" icon="i-lucide-check-check" :loading="!!busyId" :label="t('queues.complete')" @click="complete" />
        </div>
      </template>
    </UModal>
  </AppPage>
</template>
