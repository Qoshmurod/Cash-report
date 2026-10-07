<script setup lang="ts">
import type { FormError, TableColumn } from '@nuxt/ui'
import type { Service, ServicePriceHistory } from '~/types/api'

definePageMeta({ roles: ['ADMIN'], titleKey: 'nav.services' })

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const { format } = useMoney()
const { formatDateTime } = useDate()
const lookups = useLookupOptions()

const list = usePaginatedList<Service, { departmentId: string | undefined; isActive: string | undefined }>('/services', {
  filters: { departmentId: undefined, isActive: undefined },
  sortBy: 'name',
  sortOrder: 'ASC',
})
const sortHeader = useSortHeader(list)
onMounted(() => {
  void lookups.store.loadDepartments().catch(() => undefined)
  void lookups.store.loadDoctors().catch(() => undefined)
})

const columns = computed<TableColumn<Service>[]>(() => [
  { accessorKey: 'name', header: sortHeader(t('services.name'), 'name') },
  { accessorKey: 'code', header: sortHeader(t('services.code'), 'code') },
  { id: 'department', header: t('services.department') },
  { accessorKey: 'price', header: sortHeader(t('services.price'), 'price') },
  { accessorKey: 'durationMinutes', header: t('services.duration') },
  { id: 'doctors', header: t('services.doctors') },
  { accessorKey: 'isActive', header: t('common.status') },
  { id: 'actions', header: '' },
])
const activeOptions = computed(() => [
  { value: 'true', label: t('common.active') },
  { value: 'false', label: t('common.inactive') },
])

interface ServiceForm {
  departmentId: string | undefined
  name: string
  nameRu: string
  code: string
  price: number
  durationMinutes: number
  description: string
  isActive: boolean
  doctorIds: string[]
}
const open = ref(false)
const editing = ref<Service | null>(null)
const saving = ref(false)
const form = reactive<ServiceForm>({ departmentId: undefined, name: '', nameRu: '', code: '', price: 0, durationMinutes: 15, description: '', isActive: true, doctorIds: [] })

function openForm(s: Service | null) {
  editing.value = s
  Object.assign(form, {
    departmentId: s?.departmentId ?? list.filters.departmentId,
    name: s?.name ?? '',
    nameRu: s?.nameRu ?? '',
    code: s?.code ?? '',
    price: s?.price ?? 0,
    durationMinutes: s?.durationMinutes ?? 15,
    description: s?.description ?? '',
    isActive: s?.isActive ?? true,
    doctorIds: s?.doctors?.map((d) => d.id) ?? [],
  })
  open.value = true
}

function validate(s: ServiceForm): FormError[] {
  const e: FormError[] = []
  if (!s.departmentId) e.push({ name: 'departmentId', message: t('validation.required') })
  if (!s.name.trim()) e.push({ name: 'name', message: t('validation.required') })
  if (!/^[A-Z0-9-]{2,30}$/.test(s.code.trim().toUpperCase())) e.push({ name: 'code', message: t('services.codeRule') })
  if (!(s.price >= 0)) e.push({ name: 'price', message: t('validation.positive') })
  if (!(s.durationMinutes > 0)) e.push({ name: 'durationMinutes', message: t('validation.positive') })
  return e
}

async function save() {
  saving.value = true
  try {
    const body = {
      departmentId: form.departmentId,
      name: form.name.trim(),
      nameRu: form.nameRu.trim() || null,
      code: form.code.trim().toUpperCase(),
      price: form.price,
      durationMinutes: form.durationMinutes,
      description: form.description.trim() || null,
      isActive: form.isActive,
    }
    if (editing.value) {
      const priceChanged = editing.value.price !== form.price
      await api.patch(`/services/${editing.value.id}`, body)
      await api.put(`/services/${editing.value.id}/doctors`, { doctorIds: form.doctorIds })
      toast.add({ title: priceChanged ? t('toast.priceChanged') : t('toast.serviceUpdated'), color: 'success', icon: 'i-lucide-check' })
    } else {
      await api.post('/services', { ...body, doctorIds: form.doctorIds })
      toast.add({ title: t('toast.serviceCreated'), color: 'success', icon: 'i-lucide-check' })
    }
    open.value = false
    lookups.store.invalidate()
    void list.refresh()
  } finally {
    saving.value = false
  }
}

async function deactivate(s: Service) {
  const r = await confirm({ title: t('services.deactivateTitle', { name: s.name }), description: t('services.deactivateDescription'), color: 'error', confirmLabel: t('common.deactivate') })
  if (!r.confirmed) return
  await api.del(`/services/${s.id}`)
  toast.add({ title: t('toast.serviceDeactivated'), color: 'success', icon: 'i-lucide-check' })
  void list.refresh()
}

async function activate(s: Service) {
  await api.patch(`/services/${s.id}`, { isActive: true })
  toast.add({ title: t('toast.serviceUpdated'), color: 'success', icon: 'i-lucide-check' })
  void list.refresh()
}

// Price history
const historyFor = ref<Service | null>(null)
const history = ref<ServicePriceHistory[]>([])
const historyLoading = ref(false)
const historyOpen = computed({
  get: () => !!historyFor.value,
  set: (v: boolean) => {
    if (!v) historyFor.value = null
  },
})
async function showHistory(s: Service) {
  historyFor.value = s
  historyLoading.value = true
  try {
    history.value = await api.get<ServicePriceHistory[]>(`/services/${s.id}/price-history`)
  } catch {
    history.value = []
  } finally {
    historyLoading.value = false
  }
}
</script>

<template>
  <AppPage :title="t('nav.services')" :description="t('services.subtitle')">
    <ListToolbar v-model:search="list.search.value" :search-placeholder="t('services.searchPlaceholder')" :active-filters="list.activeFilterCount.value" @reset="list.resetFilters">
      <template #filters>
        <FilterSelect v-model="list.filters.departmentId" :items="lookups.departmentOptions.value" icon="i-lucide-building-2" />
        <FilterSelect v-model="list.filters.isActive" :items="activeOptions" icon="i-lucide-toggle-left" />
      </template>
      <template #actions>
        <ExportMenu type="services" :query="list.query.value" />
        <UButton icon="i-lucide-plus" :label="t('services.create')" @click="openForm(null)" />
      </template>
    </ListToolbar>
    <DataTable
      v-model:page="list.page.value"
      v-model:limit="list.limit.value"
      :data="list.items.value"
      :columns="columns"
      :loading="list.loading.value"
      :error="list.error.value"
      :meta="list.meta.value"
      empty-icon="i-lucide-clipboard-list"
      @retry="list.refresh"
    >
      <template #name-cell="{ row }">
        <p class="font-medium text-highlighted">{{ row.original.name }}</p>
        <p v-if="row.original.nameRu" class="text-xs text-muted">{{ row.original.nameRu }}</p>
      </template>
      <template #code-cell="{ row }"><UBadge color="neutral" variant="soft" class="font-mono">{{ row.original.code }}</UBadge></template>
      <template #department-cell="{ row }">{{ row.original.department ? lookups.depName(row.original.department) : '—' }}</template>
      <template #price-cell="{ row }"><MoneyText :value="row.original.price" class="font-medium" /></template>
      <template #durationMinutes-cell="{ row }">{{ t('services.minutes', { n: row.original.durationMinutes }) }}</template>
      <template #doctors-cell="{ row }">
        <div v-if="row.original.doctors?.length" class="flex flex-wrap gap-1">
          <UBadge v-for="d in row.original.doctors" :key="d.id" color="secondary" variant="soft" size="sm">
            {{ doctorName(d) }} · {{ d.roomNumber }}
          </UBadge>
        </div>
        <UBadge v-else color="warning" variant="subtle" size="sm">{{ t('services.noDoctors') }}</UBadge>
      </template>
      <template #isActive-cell="{ row }">
        <UBadge :color="row.original.isActive ? 'success' : 'neutral'" variant="subtle">{{ row.original.isActive ? t('common.active') : t('common.inactive') }}</UBadge>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UTooltip :text="t('services.priceHistory')">
            <UButton color="neutral" variant="ghost" icon="i-lucide-history" :aria-label="t('services.priceHistory')" @click="showHistory(row.original)" />
          </UTooltip>
          <UButton color="neutral" variant="ghost" icon="i-lucide-pencil" :aria-label="t('common.edit')" @click="openForm(row.original)" />
          <UButton v-if="row.original.isActive" color="error" variant="ghost" icon="i-lucide-power" :aria-label="t('common.deactivate')" @click="deactivate(row.original)" />
          <UButton v-else color="success" variant="ghost" icon="i-lucide-power" :aria-label="t('common.activate')" @click="activate(row.original)" />
        </div>
      </template>
    </DataTable>

    <USlideover v-model:open="open" :title="editing ? t('services.edit') : t('services.create')" :ui="{ content: 'max-w-xl' }">
      <template #body>
        <UForm id="service-form" :state="form" :validate="validate" class="grid gap-4 sm:grid-cols-2" @submit="save">
          <UFormField :label="t('services.department')" name="departmentId" required class="sm:col-span-2">
            <USelect v-model="form.departmentId" :items="lookups.departmentOptions.value" :placeholder="t('common.select')" class="w-full" />
          </UFormField>
          <UFormField :label="t('services.nameUz')" name="name" required class="sm:col-span-2">
            <UInput v-model="form.name" class="w-full" />
          </UFormField>
          <UFormField :label="t('services.nameRu')" name="nameRu" class="sm:col-span-2">
            <UInput v-model="form.nameRu" class="w-full" />
          </UFormField>
          <UFormField :label="t('services.code')" name="code" required :hint="t('services.codeHint')">
            <UInput v-model="form.code" class="w-full font-mono uppercase" />
          </UFormField>
          <UFormField :label="t('services.durationMin')" name="durationMinutes" required>
            <UInputNumber v-model="form.durationMinutes" :min="1" :max="600" class="w-full" />
          </UFormField>
          <UFormField :label="t('services.priceWithCurrency', { currency: useMoney().currency.value })" name="price" required class="sm:col-span-2" :help="editing && editing.price !== form.price ? t('services.priceChangeHelp', { old: format(editing.price) }) : undefined">
            <UInputNumber v-model="form.price" :min="0" :step="1000" class="w-full" :format-options="{ useGrouping: true, maximumFractionDigits: 0 }" />
          </UFormField>
          <UFormField :label="t('services.doctors')" name="doctorIds" class="sm:col-span-2" :hint="t('services.doctorsHint')">
            <USelectMenu v-model="form.doctorIds" :items="lookups.doctorOptions.value" value-key="value" multiple :placeholder="t('common.select')" class="w-full" />
          </UFormField>
          <UFormField :label="t('common.description')" name="description" class="sm:col-span-2">
            <UTextarea v-model="form.description" :rows="3" class="w-full" />
          </UFormField>
          <UFormField :label="t('common.status')" name="isActive">
            <USwitch v-model="form.isActive" :label="form.isActive ? t('common.active') : t('common.inactive')" />
          </UFormField>
        </UForm>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" :label="t('common.cancel')" @click="open = false" />
          <UButton type="submit" form="service-form" :loading="saving" icon="i-lucide-save" :label="t('common.save')" />
        </div>
      </template>
    </USlideover>

    <USlideover v-model:open="historyOpen" :title="t('services.priceHistoryOf', { name: historyFor?.name ?? '' })">
      <template #body>
        <div v-if="historyLoading" class="space-y-3">
          <USkeleton v-for="i in 4" :key="i" class="h-14" />
        </div>
        <EmptyState v-else-if="!history.length" :title="t('services.noPriceChanges')" icon="i-lucide-history" />
        <ol v-else class="relative space-y-5 border-s border-default ps-5">
          <li v-for="h in history" :key="h.id">
            <span class="absolute -start-1.5 mt-1.5 size-3 rounded-full bg-primary ring-4 ring-default" />
            <p class="text-xs text-muted">{{ formatDateTime(h.changedAt) }} · {{ personName(h.changedBy) }}</p>
            <p class="mt-1 flex items-center gap-2 text-sm">
              <MoneyText :value="h.oldPrice" class="text-muted line-through" />
              <UIcon name="i-lucide-arrow-right" class="size-4 text-dimmed" />
              <MoneyText :value="h.newPrice" class="font-semibold" :class="h.newPrice > h.oldPrice ? 'text-error' : 'text-success'" />
            </p>
          </li>
        </ol>
      </template>
    </USlideover>
  </AppPage>
</template>
