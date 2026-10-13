<script setup lang="ts">
import type { Doctor, QueueTicket } from '~/types/api'

const props = defineProps<{ ticket: QueueTicket | null }>()
const emit = defineEmits<{ close: []; done: [QueueTicket] }>()
const { t } = useI18n()
const api = useApi()
const toast = useToast()
const doctors = ref<Doctor[]>([])
const doctorId = ref<string | undefined>()
const loading = ref(false)
const saving = ref(false)

const open = computed({
  get: () => !!props.ticket,
  set: (v: boolean) => {
    if (!v) emit('close')
  },
})

watch(
  () => props.ticket,
  async (tk) => {
    doctorId.value = undefined
    doctors.value = []
    if (!tk) return
    loading.value = true
    try {
      const serviceId = tk.services[0]?.id
      doctors.value = (await api.get<Doctor[]>('/doctors', { serviceId, available: true, limit: 100 })).filter((d) => d.id !== tk.doctorId)
    } finally {
      loading.value = false
    }
  },
)

const options = computed(() => doctors.value.map((d) => ({ value: d.id, label: `${doctorName(d)} · ${d.specialty} · ${t('queues.roomShort', { room: d.roomNumber })}` })))

async function submit() {
  if (!props.ticket || !doctorId.value) return
  saving.value = true
  try {
    const res = await api.post<QueueTicket>(`/queues/${props.ticket.id}/transfer`, { doctorId: doctorId.value })
    toast.add({ title: t('toast.ticketTransferred'), color: 'success', icon: 'i-lucide-check' })
    emit('done', res)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="t('queues.transferTitle', { n: props.ticket?.ticketNumber ?? '' })">
    <template #body>
      <UFormField :label="t('queues.doctor')">
        <USelect v-model="doctorId" :items="options" :loading="loading" :placeholder="t('common.select')" class="w-full" />
      </UFormField>
      <p v-if="!loading && !options.length" class="mt-2 text-sm text-muted">{{ t('queues.noOtherDoctors') }}</p>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" :label="t('common.cancel')" @click="emit('close')" />
        <UButton :disabled="!doctorId" :loading="saving" icon="i-lucide-arrow-right-left" :label="t('queues.transfer')" @click="submit" />
      </div>
    </template>
  </UModal>
</template>
