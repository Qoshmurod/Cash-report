<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

const emit = defineEmits<{ done: [] }>()
const { t } = useI18n()
const api = useApi()
const toast = useToast()
const state = reactive({ oldPassword: '', newPassword: '', confirm: '' })
const loading = ref(false)
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

function validate(s: typeof state): FormError[] {
  const errors: FormError[] = []
  if (!s.oldPassword) errors.push({ name: 'oldPassword', message: t('validation.required') })
  if (!PASSWORD_RULE.test(s.newPassword)) errors.push({ name: 'newPassword', message: t('password.rule') })
  if (s.newPassword && s.newPassword === s.oldPassword) errors.push({ name: 'newPassword', message: t('password.sameAsOld') })
  if (s.confirm !== s.newPassword) errors.push({ name: 'confirm', message: t('password.mismatch') })
  return errors
}

async function submit() {
  loading.value = true
  try {
    await api.post('/auth/change-password', { oldPassword: state.oldPassword, newPassword: state.newPassword })
    toast.add({ title: t('toast.passwordChanged'), color: 'success', icon: 'i-lucide-check' })
    Object.assign(state, { oldPassword: '', newPassword: '', confirm: '' })
    emit('done')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UForm :state="state" :validate="validate" class="space-y-4" @submit="submit">
    <UFormField :label="t('password.old')" name="oldPassword" required>
      <UInput v-model="state.oldPassword" type="password" autocomplete="current-password" class="w-full" />
    </UFormField>
    <UFormField :label="t('password.new')" name="newPassword" required :hint="t('password.ruleShort')">
      <UInput v-model="state.newPassword" type="password" autocomplete="new-password" class="w-full" />
    </UFormField>
    <UFormField :label="t('password.confirm')" name="confirm" required>
      <UInput v-model="state.confirm" type="password" autocomplete="new-password" class="w-full" />
    </UFormField>
    <div class="flex justify-end">
      <UButton type="submit" :loading="loading" icon="i-lucide-key-round" :label="t('password.submit')" />
    </div>
  </UForm>
</template>
