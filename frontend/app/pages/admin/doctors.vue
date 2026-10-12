<script setup lang="ts">
import type { FormError } from '@nuxt/ui'
import type { Doctor, WorkSchedule } from '~/types/api'
import { WEEKDAYS } from '~/types/api'
import { defaultSchedule } from '~/utils/schedule'

definePageMeta({ roles: ['ADMIN'], titleKey: 'nav.doctors' })

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const lookups = useLookupOptions()

const list = usePaginatedList<Doctor, { departmentId: string | undefined; serviceId: string | undefined }>('/doctors', {
  filters: { departmentId: undefined, serviceId: undefined },
  limit: 24,
  sortBy: 'createdAt',
  sortOrder: 'ASC',
})
onMounted(() => {
  void lookups.store.loadDepartments().catch(() => undefined)
  void lookups.store.loadServices().catch(() => undefined)
})

async function toggleAvailability(d: Doctor, value: boolean) {
  const updated = await api.patch<Doctor>(`/doctors/${d.id}`, { isAvailable: value })
  d.isAvailable = updated.isAvailable
  toast.add({ title: value ? t('toast.doctorAvailable') : t('toast.doctorUnavailable'), color: 'success', icon: 'i-lucide-check' })
}

interface DoctorForm {
  specialty: string
  roomNumber: string
  isAvailable: boolean
  workSchedule: WorkSchedule
  serviceIds: string[]
}
const editing = ref<Doctor | null>(null)
const saving = ref(false)
const form = reactive<DoctorForm>({ specialty: '', roomNumber: '', isAvailable: true, workSchedule: defaultSchedule(), serviceIds: [] })
const open = computed({
  get: () => !!editing.value,
  set: (v: boolean) => {
    if (!v) editing.value = null
  },
})

function edit(d: Doctor) {
  editing.value = d
  Object.assign(form, {
    specialty: d.specialty,
    roomNumber: d.roomNumber,
    isAvailable: d.isAvailable,
    workSchedule: { ...defaultSchedule(), ...d.workSchedule },
    serviceIds: d.services?.map((s) => s.id) ?? [],
  })
}

function validate(s: DoctorForm): FormError[] {
  const e: FormError[] = []
  if (!s.specialty.trim()) e.push({ name: 'specialty', message: t('validation.required') })
  if (!s.roomNumber.trim()) e.push({ name: 'roomNumber', message: t('validation.required') })
  return e
}

async function save() {
  if (!editing.value) return
  saving.value = true
  try {
    const roomChanged = editing.value.roomNumber !== form.roomNumber.trim()
    await api.patch(`/doctors/${editing.value.id}`, {
      specialty: form.specialty.trim(),
      roomNumber: form.roomNumber.trim(),
      isAvailable: form.isAvailable,
      workSchedule: form.workSchedule,
    })
    await api.put(`/doctors/${editing.value.id}/services`, { serviceIds: form.serviceIds })
    toast.add({ title: roomChanged ? t('toast.roomChanged') : t('toast.doctorUpdated'), color: 'success', icon: 'i-lucide-check' })
    editing.value = null
    lookups.store.invalidate()
    void list.refresh()
  } finally {
    saving.value = false
  }
}

function workDays(d: Doctor) {
  return WEEKDAYS.filter((w) => !!d.workSchedule?.[w])
    .map((w) => t(`weekdaysShort.${w}`))
    .join(', ')
}
</script>

<template>
  <AppPage :title="t('nav.doctors')" :description="t('doctors.subtitle')">
    <ListToolbar v-model:search="list.search.value" :search-placeholder="t('doctors.searchPlaceholder')" :active-filters="list.activeFilterCount.value" @reset="list.resetFilters">
      <template #filters>
        <FilterSelect v-model="list.filters.departmentId" :items="lookups.departmentOptions.value" icon="i-lucide-building-2" />
        <FilterSelect v-model="list.filters.serviceId" :items="lookups.serviceOptions.value" icon="i-lucide-clipboard-list" />
      </template>
      <template #actions>
        <ExportMenu type="doctors" :query="list.query.value" />
        <UButton to="/admin/staff" icon="i-lucide-user-plus" :label="t('doctors.add')" />
      </template>
    </ListToolbar>

    <ErrorState v-if="list.error.value" :error="list.error.value" @retry="list.refresh" />
    <div v-else-if="list.loading.value && !list.items.value.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      <USkeleton v-for="i in 8" :key="i" class="h-56 rounded-xl" />
    </div>
    <EmptyState v-else-if="list.isEmpty.value" :title="t('doctors.empty')" icon="i-lucide-stethoscope" />
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      <UCard v-for="d in list.items.value" :key="d.id" :ui="{ body: 'p-4 sm:p-5 h-full flex flex-col' }">
        <div class="flex items-start gap-3">
          <UChip :color="d.isAvailable && d.user?.status === 'ACTIVE' ? 'success' : 'neutral'" position="bottom-right" inset size="xl">
            <UAvatar :src="d.user?.avatar ?? undefined" :alt="doctorName(d)" size="lg" />
          </UChip>
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold text-highlighted">{{ doctorName(d) }}</p>
            <p class="truncate text-sm text-muted">{{ d.specialty }}</p>
          </div>
          <div class="text-center">
            <p class="text-[10px] uppercase tracking-wide text-dimmed">{{ t('doctor.room') }}</p>
            <p class="font-mono text-xl font-bold text-primary">{{ d.roomNumber }}</p>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-1">
          <UBadge v-for="s in (d.services ?? []).slice(0, 5)" :key="s.id" color="neutral" variant="soft" size="sm">{{ lookups.serviceName(s) }}</UBadge>
          <UBadge v-if="(d.services?.length ?? 0) > 5" color="neutral" variant="outline" size="sm">+{{ (d.services?.length ?? 0) - 5 }}</UBadge>
          <UBadge v-if="!d.services?.length" color="warning" variant="subtle" size="sm">{{ t('doctors.noServices') }}</UBadge>
        </div>
        <p class="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <UIcon name="i-lucide-calendar-clock" class="size-3.5" />
          {{ workDays(d) || t('doctor.dayOff') }}
        </p>
        <div class="mt-auto flex items-center justify-between border-t border-default pt-3 mt-4">
          <USwitch
            :model-value="d.isAvailable"
            :label="d.isAvailable ? t('doctor.available') : t('doctor.unavailable')"
            :disabled="d.user?.status !== 'ACTIVE'"
            @update:model-value="(v: boolean) => toggleAvailability(d, v)"
          />
          <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-pencil" :label="t('common.edit')" @click="edit(d)" />
        </div>
      </UCard>
    </div>
    <div v-if="list.meta.value.totalPages > 1" class="mt-6 flex justify-center">
      <UPagination v-model:page="list.page.value" :total="list.meta.value.total" :items-per-page="list.meta.value.limit" />
    </div>

    <USlideover v-model:open="open" :title="t('doctors.editTitle', { name: doctorName(editing) })" :ui="{ content: 'max-w-xl' }">
      <template #body>
        <UForm id="doctor-form" :state="form" :validate="validate" class="space-y-5" @submit="save">
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField :label="t('doctor.specialty')" name="specialty" required>
              <UInput v-model="form.specialty" class="w-full" />
            </UFormField>
            <UFormField :label="t('doctor.room')" name="roomNumber" required :help="editing && editing.roomNumber !== form.roomNumber ? t('doctors.roomChangeHelp') : undefined">
              <UInput v-model="form.roomNumber" icon="i-lucide-door-open" class="w-full" />
            </UFormField>
          </div>
          <USwitch v-model="form.isAvailable" :label="t('doctor.acceptingPatients')" />
          <UFormField :label="t('doctor.services')" :hint="t('doctors.servicesHint')">
            <USelectMenu v-model="form.serviceIds" :items="lookups.serviceOptions.value" value-key="value" multiple :placeholder="t('common.select')" class="w-full" />
          </UFormField>
          <UFormField :label="t('doctor.schedule')">
            <WorkScheduleEditor v-model="form.workSchedule" />
          </UFormField>
        </UForm>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" :label="t('common.cancel')" @click="editing = null" />
          <UButton type="submit" form="doctor-form" :loading="saving" icon="i-lucide-save" :label="t('common.save')" />
        </div>
      </template>
    </USlideover>
  </AppPage>
</template>
