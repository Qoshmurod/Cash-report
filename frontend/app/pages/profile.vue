<script setup lang="ts">
import type { FormError, TabsItem } from '@nuxt/ui'
import type { PersonState } from '~/components/forms/PersonFields.vue'
import type { User } from '~/types/api'
import { personToState, stateToPayload, validatePerson } from '~/utils/person'

definePageMeta({ titleKey: 'profile.title' })

const { t } = useI18n()
const api = useApi()
const auth = useAuthStore()
const toast = useToast()
const labels = useLabels()
const { formatDateTime } = useDate()

const tab = ref('info')
const tabs = computed<TabsItem[]>(() => [
  { label: t('profile.info'), icon: 'i-lucide-user-round', value: 'info' },
  { label: t('profile.security'), icon: 'i-lucide-key-round', value: 'security' },
  { label: t('profile.loginHistory'), icon: 'i-lucide-history', value: 'history' },
])

const loading = ref(true)
const saving = ref(false)
const profile = ref<User | null>(null)
const form = ref<PersonState>(personToState({ firstName: '', lastName: '', middleName: null, birthDate: null, gender: null, phone: null, email: null, address: null }))
const avatar = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    profile.value = await api.get<User>('/profile')
    form.value = personToState(profile.value)
    avatar.value = profile.value.avatar
  } finally {
    loading.value = false
  }
}
onMounted(load)

const validate = (s: PersonState): FormError[] => validatePerson(s, t)

async function save() {
  saving.value = true
  try {
    const updated = await api.patch<User>('/profile', { ...stateToPayload(form.value), avatar: avatar.value })
    profile.value = updated
    auth.setUser({ ...updated })
    toast.add({ title: t('toast.profileSaved'), color: 'success', icon: 'i-lucide-check' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppPage :title="t('profile.title')">
    <div class="grid gap-6 xl:grid-cols-[320px_1fr]">
      <UCard>
        <div v-if="loading" class="flex flex-col items-center gap-3 py-4">
          <USkeleton class="size-24 rounded-full" />
          <USkeleton class="h-5 w-40" />
          <USkeleton class="h-4 w-24" />
        </div>
        <div v-else-if="profile" class="flex flex-col items-center text-center">
          <UAvatar :src="avatar ?? undefined" :alt="auth.fullName" size="3xl" icon="i-lucide-user" class="size-24 text-3xl" />
          <p class="mt-3 text-lg font-semibold text-highlighted">{{ personName(profile, true) }}</p>
          <StatusBadge kind="role" :value="profile.role" class="mt-1" />
          <div class="mt-5 w-full divide-y divide-default text-left">
            <InfoRow :label="t('auth.login')" :value="profile.login" icon="i-lucide-at-sign" />
            <InfoRow :label="t('person.phone')" :value="profile.phone" icon="i-lucide-phone" />
            <InfoRow :label="t('person.email')" :value="profile.email" icon="i-lucide-mail" />
            <InfoRow :label="t('profile.lastLogin')" :value="formatDateTime(profile.lastLoginAt)" icon="i-lucide-clock" />
            <template v-if="profile.doctor">
              <InfoRow :label="t('doctor.specialty')" :value="profile.doctor.specialty" icon="i-lucide-stethoscope" />
              <InfoRow :label="t('doctor.room')" :value="profile.doctor.roomNumber" icon="i-lucide-door-open" />
            </template>
            <InfoRow :label="t('common.status')" icon="i-lucide-activity">
              <StatusBadge kind="user" :value="profile.status" size="sm" />
            </InfoRow>
            <InfoRow :label="t('common.createdAt')" :value="formatDateTime(profile.createdAt)" icon="i-lucide-calendar" />
          </div>
          <p class="sr-only">{{ labels.role(profile.role) }}</p>
        </div>
      </UCard>

      <div class="min-w-0">
        <UTabs v-model="tab" :items="tabs" variant="link" class="mb-4" :content="false" />
        <UCard v-if="tab === 'info'">
          <div v-if="loading" class="grid gap-4 sm:grid-cols-2">
            <USkeleton v-for="i in 8" :key="i" class="h-10" />
          </div>
          <UForm v-else :state="form" :validate="validate" class="space-y-6" @submit="save">
            <AvatarUpload v-model="avatar" :name="auth.fullName" />
            <PersonFields v-model="form" />
            <div class="flex justify-end">
              <UButton type="submit" :loading="saving" icon="i-lucide-save" :label="t('common.save')" />
            </div>
          </UForm>
        </UCard>
        <UCard v-else-if="tab === 'security'" class="max-w-xl">
          <h3 class="mb-1 font-semibold text-highlighted">{{ t('password.title') }}</h3>
          <p class="mb-5 text-sm text-muted">{{ t('password.hint') }}</p>
          <PasswordChangeForm />
        </UCard>
        <LoginHistoryTable v-else path="/profile/login-history" />
      </div>
    </div>
  </AppPage>
</template>
