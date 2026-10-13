<script setup lang="ts">
import type { Gender } from '~/types/api'
import { formatUzPhone } from '~/utils/phone'

export interface PersonState {
  firstName: string
  lastName: string
  middleName: string
  birthDate: string
  gender: Gender | undefined
  phone: string
  email: string
  address: string
  profession?: string
  passport?: string
}

const props = defineProps<{ showProfession?: boolean; showPassport?: boolean; phoneRequired?: boolean }>()
const model = defineModel<PersonState>({ required: true })
const { t } = useI18n()
const labels = useLabels()

function onPhoneBlur() {
  if (model.value.phone.trim()) model.value.phone = formatUzPhone(model.value.phone)
}
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <UFormField :label="t('person.lastName')" name="lastName" required>
      <UInput v-model="model.lastName" class="w-full" autocomplete="family-name" />
    </UFormField>
    <UFormField :label="t('person.firstName')" name="firstName" required>
      <UInput v-model="model.firstName" class="w-full" autocomplete="given-name" />
    </UFormField>
    <UFormField :label="t('person.middleName')" name="middleName">
      <UInput v-model="model.middleName" class="w-full" autocomplete="additional-name" />
    </UFormField>
    <UFormField :label="t('person.birthDate')" name="birthDate">
      <UInput v-model="model.birthDate" type="date" class="w-full" :max="new Date().toISOString().slice(0, 10)" />
    </UFormField>
    <UFormField :label="t('person.gender')" name="gender">
      <USelect v-model="model.gender" :items="labels.genderOptions.value" :placeholder="t('common.select')" class="w-full" />
    </UFormField>
    <UFormField :label="t('person.phone')" name="phone" :required="props.phoneRequired">
      <UInput v-model="model.phone" type="tel" icon="i-lucide-phone" placeholder="+998 90 123 45 67" class="w-full" autocomplete="tel" @blur="onPhoneBlur" />
    </UFormField>
    <UFormField :label="t('person.email')" name="email">
      <UInput v-model="model.email" type="email" icon="i-lucide-mail" class="w-full" autocomplete="email" />
    </UFormField>
    <UFormField v-if="props.showPassport" :label="t('person.passport')" name="passport">
      <UInput v-model="model.passport" icon="i-lucide-id-card" class="w-full" :placeholder="t('person.passportPlaceholder')" />
    </UFormField>
    <UFormField v-if="props.showProfession" :label="t('person.profession')" name="profession">
      <UInput v-model="model.profession" class="w-full" />
    </UFormField>
    <UFormField :label="t('person.address')" name="address" class="sm:col-span-2">
      <UTextarea v-model="model.address" :rows="2" class="w-full" autoresize />
    </UFormField>
  </div>
</template>
