import type { AnnouncementLanguage, ChimeProvider, VoiceProvider } from '~/utils/voice/types'
import { SpeechSynthesisProvider } from '~/utils/voice/speech-synthesis'
import { WebAudioChime } from '~/utils/voice/web-audio-chime'

export interface TicketAnnouncement {
  ticketNumber: string
  roomNumber: string | null
  lang: AnnouncementLanguage
}

/** Speak "A19" as "A 19" so TTS engines read letter + number naturally. */
function spokenTicket(ticket: string): string {
  return ticket.replace(/^([A-Za-z]+)(\d+)$/, '$1 $2')
}

// Module-level singleton: one announcement queue per browser tab.
const state = {
  provider: new SpeechSynthesisProvider() as VoiceProvider,
  chime: new WebAudioChime() as ChimeProvider,
  queue: [] as TicketAnnouncement[],
  busy: false,
}
const enabled = ref(false)
const speaking = ref(false)

export function useVoiceAnnouncer() {
  const nuxtApp = useNuxtApp()
  const i18n = nuxtApp.$i18n

  function setProvider(provider: VoiceProvider) {
    state.provider.cancel()
    state.provider = provider
  }

  function setChime(chime: ChimeProvider) {
    state.chime = chime
  }

  /** Must be called from a user gesture (browser autoplay policy). */
  async function enable() {
    await state.chime.unlock()
    await Promise.all((['uz', 'ru'] as const).map((l) => i18n.loadLocaleMessages(l)))
    // Warm-up: some browsers load voices lazily
    if (state.provider.isSupported()) window.speechSynthesis.getVoices()
    enabled.value = true
  }

  function disable() {
    enabled.value = false
    state.queue.length = 0
    state.provider.cancel()
  }

  function textFor(a: TicketAnnouncement): string {
    const params = { ticket: spokenTicket(a.ticketNumber), room: a.roomNumber ?? '' }
    const key = a.roomNumber ? 'voice.call' : 'voice.callNoRoom'
    return i18n.t(key, params, { locale: a.lang })
  }

  async function drain() {
    if (state.busy) return
    state.busy = true
    speaking.value = true
    try {
      while (state.queue.length && enabled.value) {
        const next = state.queue.shift()
        if (!next) break
        await state.chime.play()
        await state.provider.speak(textFor(next), next.lang)
      }
    } finally {
      state.busy = false
      speaking.value = false
    }
  }

  function announce(a: TicketAnnouncement) {
    if (!enabled.value) return
    state.queue.push(a)
    void drain()
  }

  return {
    enabled: readonly(enabled),
    speaking: readonly(speaking),
    supported: state.provider.isSupported(),
    enable,
    disable,
    announce,
    textFor,
    setProvider,
    setChime,
  }
}
