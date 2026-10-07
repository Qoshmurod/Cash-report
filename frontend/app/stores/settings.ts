import { defineStore } from 'pinia'
import type { PublicSettings, SystemSettings } from '~/types/api'

const DEFAULTS: PublicSettings = {
  hospitalName: 'Shifoxona',
  logo: null,
  phone: '',
  address: '',
  currency: 'UZS',
  timezone: 'Asia/Tashkent',
  voiceAnnouncements: true,
  announcementLanguage: 'uz',
}

export const useSettingsStore = defineStore('settings', () => {
  const publicSettings = ref<PublicSettings>({ ...DEFAULTS })
  const full = ref<SystemSettings | null>(null)
  const loaded = ref(false)

  const hospitalName = computed(() => publicSettings.value.hospitalName || DEFAULTS.hospitalName)
  const currency = computed(() => publicSettings.value.currency || DEFAULTS.currency)
  const timezone = computed(() => publicSettings.value.timezone || DEFAULTS.timezone)

  async function loadPublic(force = false) {
    if (loaded.value && !force) return
    const api = useApi()
    try {
      publicSettings.value = { ...DEFAULTS, ...(await api.get<PublicSettings>('/settings/public', undefined, { public: true })) }
      loaded.value = true
    } catch {
      // backend unreachable — keep defaults, the page shows its own error state
    }
  }

  function applyFull(s: SystemSettings) {
    full.value = s
    publicSettings.value = {
      hospitalName: s.hospitalName,
      logo: s.logo,
      phone: s.phone,
      address: s.address,
      currency: s.currency,
      timezone: s.timezone,
      voiceAnnouncements: s.voiceAnnouncements,
      announcementLanguage: s.announcementLanguage,
    }
  }

  return { publicSettings, full, loaded, hospitalName, currency, timezone, loadPublic, applyFull }
})
