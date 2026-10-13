<script setup lang="ts">
import type { Weekday, WorkSchedule } from '~/types/api'
import { WEEKDAYS } from '~/types/api'

const model = defineModel<WorkSchedule>({ required: true })
const { t } = useI18n()
const DEFAULT_DAY = { start: '09:00', end: '18:00' }

function toggle(day: Weekday, on: boolean) {
  model.value = { ...model.value, [day]: on ? (model.value[day] ?? { ...DEFAULT_DAY }) : null }
}
function setTime(day: Weekday, key: 'start' | 'end', value: string) {
  const current = model.value[day] ?? { ...DEFAULT_DAY }
  model.value = { ...model.value, [day]: { ...current, [key]: value } }
}
</script>

<template>
  <div class="divide-y divide-default rounded-lg border border-default">
    <div v-for="day in WEEKDAYS" :key="day" class="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
      <USwitch :model-value="!!model[day]" :label="t(`weekdays.${day}`)" class="min-w-36" @update:model-value="(v: boolean) => toggle(day, v)" />
      <div v-if="model[day]" class="flex items-center gap-2">
        <UInput type="time" size="sm" :model-value="model[day]?.start" :aria-label="t('doctor.start')" @update:model-value="(v: string | number) => setTime(day, 'start', String(v))" />
        <span class="text-muted">—</span>
        <UInput type="time" size="sm" :model-value="model[day]?.end" :aria-label="t('doctor.end')" @update:model-value="(v: string | number) => setTime(day, 'end', String(v))" />
      </div>
      <span v-else class="text-sm text-dimmed">{{ t('doctor.dayOff') }}</span>
    </div>
  </div>
</template>
