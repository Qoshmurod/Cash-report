<script setup lang="ts">
import type { KioskRequest } from '~/types/api'
import { WebAudioChime } from '~/utils/voice/web-audio-chime'

definePageMeta({ roles: ['REGISTRAR', 'ADMIN'], titleKey: 'nav.requests' })

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const labels = useLabels()
const realtime = useRealtime()
const { confirm } = useConfirm()
const { formatTime, minutesBetween } = useDate()
const { format } = useMoney()

const list = usePaginatedList<KioskRequest, { status: string | undefined }>('/kiosk-requests', {
  filters: { status: 'NEW,IN_REVIEW' },
  sortBy: 'createdAt',
  sortOrder: 'ASC',
  limit: 50,
})
const chime = new WebAudioChime()
const highlight = ref<string | null>(null)
const now = useNow({ scheduler: (cb) => useIntervalFn(cb, 30_000) })

realtime.on('kiosk:new', (e) => {
  toast.add({
    title: t('registrar.newRequest', { n: e.number }),
    description: `${e.fullName} · ${t('registrar.servicesN', { n: e.servicesCount })} · ${format(e.totalAmount)}`,
    color: 'info',
    icon: 'i-lucide-bell-ring',
    actions: [{ label: t('registrar.process'), color: 'info', variant: 'solid', onClick: () => void process(e.id) }],
  })
  void chime.play().catch(() => undefined)
  highlight.value = e.id
  void list.refresh()
})
realtime.on('kiosk:updated', () => void list.refresh())
realtime.onReconnect(() => void list.refresh())

const statusTabs = computed(() => [
  { label: t('registrar.pending'), value: 'NEW,IN_REVIEW' },
  { label: labels.kioskStatus('PROCESSED'), value: 'PROCESSED' },
  { label: labels.kioskStatus('CANCELLED'), value: 'CANCELLED' },
])
const statusTab = computed({
  get: () => list.filters.status ?? 'NEW,IN_REVIEW',
  set: (v: string) => {
    list.filters.status = v
  },
})

async function process(id: string) {
  await navigateTo({ path: '/registrar/checkout', query: { request: id } })
}

async function cancel(r: KioskRequest) {
  const res = await confirm({
    title: t('registrar.cancelTitle', { n: r.number }),
    description: t('registrar.cancelDescription'),
    color: 'error',
    icon: 'i-lucide-ban',
    confirmLabel: t('registrar.cancelRequest'),
    inputLabel: t('common.reason'),
  })
  if (!res.confirmed) return
  await api.post(`/kiosk-requests/${r.id}/cancel`, { reason: res.value || undefined })
  toast.add({ title: t('toast.requestCancelled'), color: 'success', icon: 'i-lucide-check' })
  void list.refresh()
}

const waitedMinutes = (r: KioskRequest) => {
  void now.value
  return minutesBetween(r.createdAt) ?? 0
}
</script>

<template>
  <AppPage :title="t('nav.requests')" :description="t('registrar.subtitle')">
    <template #actions>
      <UButton to="/registrar/checkout" size="lg" icon="i-lucide-clipboard-plus" :label="t('nav.newRegistration')" />
    </template>

    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <UTabs v-model="statusTab" :items="statusTabs" :content="false" />
      <div class="flex items-center gap-2">
        <UInput v-model="list.search.value" icon="i-lucide-search" :placeholder="t('registrar.searchPlaceholder')" class="w-64" />
        <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="list.loading.value" :aria-label="t('common.refresh')" @click="list.refresh" />
      </div>
    </div>

    <ErrorState v-if="list.error.value" :error="list.error.value" @retry="list.refresh" />
    <div v-else-if="list.loading.value && !list.items.value.length" class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      <USkeleton v-for="i in 6" :key="i" class="h-52 rounded-xl" />
    </div>
    <EmptyState v-else-if="list.isEmpty.value" :title="t('registrar.empty')" :description="t('registrar.emptyHint')" icon="i-lucide-inbox">
      <UButton to="/registrar/checkout" icon="i-lucide-clipboard-plus" :label="t('nav.newRegistration')" />
    </EmptyState>
    <TransitionGroup v-else tag="div" name="list" class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      <UCard
        v-for="r in list.items.value"
        :key="r.id"
        :class="highlight === r.id ? 'ring-2 ring-info' : ''"
        :ui="{ body: 'p-4 sm:p-5 flex h-full flex-col' }"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="font-mono text-sm font-semibold text-primary">#{{ r.number }}</p>
            <p class="mt-0.5 text-lg font-semibold text-highlighted">{{ personName(r, true) }}</p>
            <p class="text-sm text-muted">
              <UIcon name="i-lucide-phone" class="mr-1 size-3.5 align-[-2px]" />{{ r.phone }}
              <template v-if="r.birthDate"> · {{ r.birthDate }}</template>
            </p>
          </div>
          <div class="text-right">
            <StatusBadge kind="kiosk" :value="r.status" />
            <p class="mt-1 text-xs text-muted tabular">{{ formatTime(r.createdAt) }}</p>
            <p v-if="r.status === 'NEW' || r.status === 'IN_REVIEW'" class="text-xs" :class="waitedMinutes(r) > 10 ? 'text-error' : 'text-muted'">
              {{ t('registrar.waiting', { n: waitedMinutes(r) }) }}
            </p>
          </div>
        </div>
        <ul class="mt-4 space-y-1.5 text-sm">
          <li v-for="item in r.items" :key="item.id" class="flex justify-between gap-2">
            <span class="truncate">{{ item.serviceName }}</span>
            <MoneyText :value="item.price" :currency="false" class="text-muted" />
          </li>
        </ul>
        <div class="mt-3 flex items-center justify-between border-t border-default pt-3">
          <span class="text-sm font-medium text-muted">{{ t('common.total') }}</span>
          <MoneyText :value="r.totalAmount" class="text-lg font-bold text-highlighted" />
        </div>
        <p v-if="r.status === 'IN_REVIEW' && (r.claimedBy ?? r.processedBy)" class="mt-2 text-xs text-warning">
          {{ t('registrar.inReviewBy', { name: personName(r.claimedBy ?? r.processedBy) }) }}
        </p>
        <div v-if="r.status === 'NEW' || r.status === 'IN_REVIEW'" class="mt-auto flex gap-2 pt-4">
          <UButton color="neutral" variant="ghost" icon="i-lucide-x" :label="t('registrar.cancelRequest')" @click="cancel(r)" />
          <UButton class="flex-1" block icon="i-lucide-arrow-right" :label="t('registrar.process')" @click="process(r.id)" />
        </div>
      </UCard>
    </TransitionGroup>
  </AppPage>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
