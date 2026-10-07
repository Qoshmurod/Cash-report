<script setup lang="ts">
import type { QueueBoard, QueueBoardCurrent, QueueCalledEvent } from '~/types/api'
import { BOARD_POLL_MS, STORAGE_KEYS } from '~/utils/constants'

definePageMeta({ layout: 'display', public: true, titleKey: 'display.title' })

const { t, locale, setLocale } = useI18n()
const api = useApi()
const realtime = useRealtime()
const voice = useVoiceAnnouncer()
const { formatTime } = useDate()

const board = ref<QueueBoard | null>(null)
const offline = ref(false)
const highlight = ref<QueueBoardCurrent | null>(null)
const highlightKey = ref(0)
const soundWanted = useLocalStorage(STORAGE_KEYS.displaySound, true)
const now = useNow({ scheduler: (cb) => useIntervalFn(cb, 1000) })
const clock = computed(() => formatTime(now.value, true))
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()

async function load() {
  try {
    board.value = await api.get<QueueBoard>('/queues/board', undefined, { public: true })
    offline.value = false
    if (!highlight.value && board.value.current[0]) highlight.value = board.value.current[0]
  } catch {
    offline.value = true
  }
}
const settings = useSettingsStore()
onMounted(() => {
  void load()
  void settings.loadPublic()
})
useIntervalFn(load, BOARD_POLL_MS)

const refreshSoon = useThrottleFn(load, 800, true)
realtime.on('queue:updated', () => refreshSoon())
realtime.onReconnect(() => void load())
realtime.on('queue:called', (e: QueueCalledEvent) => {
  highlight.value = { ticketNumber: e.ticketNumber, roomNumber: e.roomNumber, departmentName: e.departmentName, doctorName: e.doctorName, calledAt: e.calledAt, status: 'CALLED' }
  highlightKey.value++
  const s = board.value?.settings
  if (s?.voiceAnnouncements !== false) voice.announce({ ticketNumber: e.ticketNumber, roomNumber: e.roomNumber, lang: s?.announcementLanguage ?? 'uz' })
  void load()
})

async function enableSound() {
  await voice.enable()
  soundWanted.value = true
}
function disableSound() {
  voice.disable()
  soundWanted.value = false
}

const recent = computed(() => (board.value?.current ?? []).filter((c) => c.ticketNumber !== highlight.value?.ticketNumber).slice(0, 8))
const waiting = computed(() => (board.value?.waiting ?? []).slice(0, 12))
const hospitalName = computed(() => board.value?.settings.hospitalName ?? '')
</script>

<template>
  <div class="flex h-dvh flex-col bg-[radial-gradient(ellipse_at_top,_rgba(20,184,166,0.18),_transparent_60%)] p-4 lg:p-8">
    <!-- Header -->
    <header class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <div class="grid size-14 place-items-center rounded-2xl bg-teal-500 text-white">
          <UIcon name="i-lucide-hospital" class="size-8" />
        </div>
        <div>
          <p class="text-2xl font-bold lg:text-3xl">{{ hospitalName }}</p>
          <p class="text-lg text-white/60">{{ t('display.subtitle') }}</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="offline || !realtime.connected.value" class="flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1.5 text-amber-300">
          <UIcon name="i-lucide-wifi-off" class="size-5" />{{ t('display.offline') }}
        </span>
        <p class="font-mono text-4xl font-bold tabular lg:text-5xl">{{ clock }}</p>
        <div class="no-print flex gap-1 opacity-40 transition hover:opacity-100">
          <UButton color="neutral" variant="ghost" size="lg" :label="locale.toUpperCase()" @click="setLocale(locale === 'uz' ? 'ru' : 'uz')" />
          <UButton
            color="neutral"
            variant="ghost"
            size="lg"
            :icon="voice.enabled.value ? 'i-lucide-volume-2' : 'i-lucide-volume-x'"
            :aria-label="t('display.sound')"
            @click="voice.enabled.value ? disableSound() : enableSound()"
          />
          <UButton color="neutral" variant="ghost" size="lg" :icon="isFullscreen ? 'i-lucide-minimize' : 'i-lucide-maximize'" :aria-label="t('display.fullscreen')" @click="toggleFullscreen" />
        </div>
      </div>
    </header>

    <div class="mt-6 grid min-h-0 flex-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
      <!-- Current call -->
      <section class="flex min-h-0 flex-col gap-6">
        <div :key="highlightKey" class="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-teal-400/30 bg-gradient-to-br from-teal-600/30 to-sky-700/20 p-8 text-center" :class="highlightKey ? 'animate-ticket-flash' : ''">
          <p class="text-2xl font-semibold uppercase tracking-[0.3em] text-teal-200 lg:text-3xl">{{ t('display.nowServing') }}</p>
          <template v-if="highlight">
            <p class="animate-ticket-pop mt-4 font-mono text-[9rem] font-black leading-none tracking-tight lg:text-[13rem]">{{ highlight.ticketNumber }}</p>
            <div class="mt-6 flex items-center gap-5">
              <UIcon name="i-lucide-arrow-right" class="size-14 text-teal-300" />
              <p class="text-6xl font-black uppercase lg:text-7xl">{{ t('display.room', { room: highlight.roomNumber ?? '—' }) }}</p>
            </div>
            <p class="mt-5 text-2xl text-white/70">{{ highlight.doctorName }} · {{ highlight.departmentName }}</p>
          </template>
          <p v-else class="mt-10 text-4xl text-white/50">{{ t('display.noCalls') }}</p>
        </div>

        <div v-if="recent.length" class="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <div v-for="c in recent" :key="c.ticketNumber + c.calledAt" class="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
            <p class="font-mono text-4xl font-bold">{{ c.ticketNumber }}</p>
            <p class="mt-1 text-xl text-teal-300">{{ t('display.room', { room: c.roomNumber ?? '—' }) }}</p>
            <p class="text-sm text-white/50">{{ c.status === 'IN_PROGRESS' ? t('display.inProgress') : t('display.called') }}</p>
          </div>
        </div>
      </section>

      <!-- Waiting -->
      <section class="flex min-h-0 flex-col rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
        <h2 class="text-3xl font-bold uppercase tracking-widest text-white/80">{{ t('display.next') }}</h2>
        <div v-if="waiting.length" class="mt-5 grid flex-1 auto-rows-min grid-cols-2 gap-4 overflow-hidden xl:grid-cols-3">
          <div v-for="(w, i) in waiting" :key="w.ticketNumber" class="rounded-2xl border p-4 text-center" :class="i < 3 ? 'border-teal-400/40 bg-teal-400/10' : 'border-white/10 bg-white/5'">
            <p class="font-mono text-4xl font-bold lg:text-5xl">{{ w.ticketNumber }}</p>
            <p class="mt-1 truncate text-base text-white/60">{{ w.departmentName }}<template v-if="w.roomNumber"> · {{ w.roomNumber }}</template></p>
          </div>
        </div>
        <p v-else class="mt-10 text-center text-2xl text-white/40">{{ t('display.noWaiting') }}</p>
      </section>
    </div>

    <!-- Autoplay unlock overlay -->
    <div v-if="!voice.enabled.value && soundWanted" class="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm">
      <div class="text-center">
        <button type="button" class="mx-auto grid size-40 place-items-center rounded-full bg-teal-500 text-white shadow-2xl transition hover:scale-105 active:scale-95" :aria-label="t('display.enableSound')" @click="enableSound">
          <UIcon name="i-lucide-volume-2" class="size-20" />
        </button>
        <p class="mt-6 text-3xl font-bold">{{ t('display.enableSound') }}</p>
        <p class="mt-2 text-lg text-white/60">{{ t('display.enableSoundHint') }}</p>
        <UButton class="mt-6" color="neutral" variant="ghost" size="lg" :label="t('display.withoutSound')" @click="soundWanted = false" />
      </div>
    </div>
  </div>
</template>
