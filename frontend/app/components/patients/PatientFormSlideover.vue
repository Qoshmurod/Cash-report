<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import type { PersonState } from '~/components/forms/PersonFields.vue'
import type { Patient } from '~/types/api'
import { normalizePhone } from '~/utils/phone'
import { emptyPerson, personToState, stateToPayload, validatePerson } from '~/utils/person'

const props = defineProps<{ patient?: Patient | null }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [Patient] }>()
const { t } = useI18n()
const api = useApi()
const toast = useToast()

const form = ref<PersonState>(emptyPerson())
const avatar = ref<string | null>(null)
const saving = ref(false)
const duplicates = ref<Patient[]>([])
const isEdit = computed(() => !!props.patient)

watch(open, (o) => {
  if (!o) return
  form.value = props.patient ? personToState(props.patient) : emptyPerson()
  avatar.value = props.patient?.avatar ?? null
  duplicates.value = []
})

const checkDuplicates = useDebounceFn(async () => {
  if (isEdit.value) return
  const phone = form.value.phone.trim() ? normalizePhone(form.value.phone) : undefined
  const passport = form.value.passport?.trim() || undefined
  const hasName = form.value.firstName.trim() && form.value.lastName.trim() && form.value.birthDate
  if (!phone && !passport && !hasName) {
    duplicates.value = []
    return
  }
  try {
    duplicates.value = await api.get<Patient[]>('/patients/check-duplicates', {
      phone,
      passport,
      firstName: hasName ? form.value.firstName.trim() : undefined,
      lastName: hasName ? form.value.lastName.trim() : undefined,
      birthDate: hasName ? form.value.birthDate : undefined,
    })
  } catch {
    duplicates.value = []
  }
}, 500)
watch(() => [form.value.phone, form.value.passport, form.value.firstName, form.value.lastName, form.value.birthDate], () => checkDuplicates())

const validate = (s: PersonState): FormError[] => validatePerson(s, t, true)

async function save() {
  saving.value = true
  try {
    const body = { ...stateToPayload(form.value, { profession: true, passport: true }), avatar: avatar.value }
    const saved = props.patient ? await api.patch<Patient>(`/patients/${props.patient.id}`, body) : await api.post<Patient>('/patients', body)
    toast.add({ title: props.patient ? t('toast.patientUpdated') : t('toast.patientCreated'), color: 'success', icon: 'i-lucide-check' })
    emit('saved', saved)
    open.value = false
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <USlideover v-model:open="open" :title="isEdit ? t('patients.edit') : t('patients.create')" :ui="{ content: 'max-w-2xl' }">
    <template #body>
      <UForm id="patient-form" :state="form" :validate="validate" class="space-y-6" @submit="save">
        <AvatarUpload v-model="avatar" />
        <UAlert v-if="duplicates.length" color="warning" variant="subtle" icon="i-lucide-users" :title="t('patients.duplicatesFound', { n: duplicates.length })">
          <template #description>
            <ul class="mt-1 space-y-1">
              <li v-for="d in duplicates" :key="d.id" class="text-sm">
                <span class="font-medium">{{ personName(d, true) }}</span>
                · {{ d.patientCode }} · {{ d.phone ?? '—' }}
              </li>
            </ul>
          </template>
        </UAlert>
        <PersonFields v-model="form" show-passport show-profession phone-required />
      </UForm>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" :label="t('common.cancel')" @click="open = false" />
        <UButton type="submit" form="patient-form" :loading="saving" icon="i-lucide-save" :label="t('common.save')" />
      </div>
    </template>
  </USlideover>
</template>
