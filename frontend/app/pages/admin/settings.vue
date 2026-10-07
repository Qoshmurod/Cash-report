<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import type { SystemSettings } from '~/types/api'
import { ApiError } from '~/utils/api-error'

definePageMeta({ roles: ['ADMIN'], titleKey: 'nav.settings' })

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const settingsStore = useSettingsStore()
const voice = useVoiceAnnouncer()

const loading = ref(true)
const saving = ref(false)
const error = ref<ApiError | null>(null)
const form = ref<SystemSettings | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const s = await api.get<SystemSettings>('/settings')
    form.value = { ...s, workingHours: { ...s.workingHours } }
  } catch (e) {
    error.value = e instanceof ApiError ? e : new ApiError(0, 'NETWORK_ERROR', String(e))
  } finally {
    loading.value = false
  }
}
onMounted(load)

const TIMEZONES = ['Asia/Tashkent', 'Asia/Samarkand', 'Asia/Almaty', 'Asia/Bishkek', 'Asia/Dushanbe', 'Europe/Moscow', 'UTC']
const CURRENCIES = ['UZS', 'USD', 'RUB', 'KZT']
const langItems = computed(() => [
  { value: 'uz', label: "O'zbekcha" },
  { value: 'ru', label: 'Русский' },
])

function validate(s: SystemSettings): FormError[] {
  const e: FormError[] = []
  if (!s.hospitalName.trim()) e.push({ name: 'hospitalName', message: t('validation.required') })
  if (s.workingHours.start >= s.workingHours.end) e.push({ name: 'workingHours', message: t('settings.hoursRule') })
  return e
}

async function save() {
  if (!form.value) return
  saving.value = true
  try {
    const saved = await api.patch<SystemSettings>('/settings', form.value)
    settingsStore.applyFull(saved)
    toast.add({ title: t('toast.settingsSaved'), color: 'success', icon: 'i-lucide-check' })
  } finally {
    saving.value = false
  }
}

async function testVoice() {
  if (!form.value) return
  await voice.enable()
  voice.announce({ ticketNumber: 'A19', roomNumber: '204', lang: form.value.announcementLanguage })
}
</script>

<template>
  <AppPage :title="t('nav.settings')" :description="t('settings.subtitle')">
    <ErrorState v-if="error" :error="error" @retry="load" />
    <div v-else-if="loading || !form" class="grid gap-6 lg:grid-cols-2">
      <USkeleton v-for="i in 4" :key="i" class="h-64 rounded-xl" />
    </div>
    <UForm v-else :state="form" :validate="validate" class="space-y-6" @submit="save">
      <div class="grid gap-6 lg:grid-cols-2">
        <PageSection :title="t('settings.hospital')" icon="i-lucide-hospital">
          <div class="space-y-4">
            <UFormField :label="t('settings.logo')">
              <AvatarUpload v-model="form.logo" square />
            </UFormField>
            <UFormField :label="t('settings.hospitalName')" name="hospitalName" required>
              <UInput v-model="form.hospitalName" class="w-full" />
            </UFormField>
            <UFormField :label="t('person.phone')" name="phone">
              <UInput v-model="form.phone" type="tel" icon="i-lucide-phone" class="w-full" />
            </UFormField>
            <UFormField :label="t('person.address')" name="address">
              <UTextarea v-model="form.address" :rows="2" class="w-full" />
            </UFormField>
          </div>
        </PageSection>

        <PageSection :title="t('settings.receipt')" icon="i-lucide-receipt">
          <div class="space-y-4">
            <UFormField :label="t('settings.receiptHeader')" name="receiptHeader" :hint="t('settings.receiptHeaderHint')">
              <UTextarea v-model="form.receiptHeader" :rows="3" class="w-full" />
            </UFormField>
            <UFormField :label="t('settings.receiptFooter')" name="receiptFooter">
              <UTextarea v-model="form.receiptFooter" :rows="3" class="w-full" />
            </UFormField>
          </div>
        </PageSection>

        <PageSection :title="t('settings.regional')" icon="i-lucide-globe">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField :label="t('settings.currency')" name="currency">
              <USelect v-model="form.currency" :items="CURRENCIES" class="w-full" />
            </UFormField>
            <UFormField :label="t('settings.timezone')" name="timezone">
              <USelect v-model="form.timezone" :items="TIMEZONES" class="w-full" />
            </UFormField>
            <UFormField :label="t('settings.workingHours')" name="workingHours" class="sm:col-span-2">
              <div class="flex items-center gap-2">
                <UInput v-model="form.workingHours.start" type="time" :aria-label="t('doctor.start')" />
                <span class="text-muted">—</span>
                <UInput v-model="form.workingHours.end" type="time" :aria-label="t('doctor.end')" />
              </div>
            </UFormField>
          </div>
        </PageSection>

        <PageSection :title="t('settings.queue')" icon="i-lucide-megaphone">
          <div class="space-y-4">
            <USwitch v-model="form.voiceAnnouncements" :label="t('settings.voiceAnnouncements')" :description="t('settings.voiceHint')" />
            <UFormField :label="t('settings.announcementLanguage')" name="announcementLanguage">
              <USelect v-model="form.announcementLanguage" :items="langItems" class="w-full sm:w-60" />
            </UFormField>
            <div class="flex flex-wrap gap-2">
              <UButton color="neutral" variant="outline" icon="i-lucide-volume-2" :label="t('settings.testVoice')" @click="testVoice" />
              <UButton to="/admin/departments" color="neutral" variant="outline" icon="i-lucide-hash" :label="t('settings.queuePrefixes')" />
            </div>
            <p class="text-xs text-muted">{{ t('settings.prefixHint') }}</p>
          </div>
        </PageSection>
      </div>
      <div class="sticky bottom-0 -mx-4 flex justify-end border-t border-default bg-default/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <UButton type="submit" size="lg" :loading="saving" icon="i-lucide-save" :label="t('common.save')" />
      </div>
    </UForm>
  </AppPage>
</template>
