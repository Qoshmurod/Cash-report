<script setup lang="ts">
import type { FormError, TableColumn } from '@nuxt/ui'
import type { Department } from '~/types/api'

definePageMeta({ roles: ['ADMIN'], titleKey: 'nav.departments' })

const { t } = useI18n()
const api = useApi()
const toast = useToast()
const { confirm } = useConfirm()
const lookups = useLookupsStore()
const list = usePaginatedList<Department, { isActive: string | undefined }>('/departments', {
  filters: { isActive: undefined },
  sortBy: 'sortOrder',
  sortOrder: 'ASC',
})
const sortHeader = useSortHeader(list)

const columns = computed<TableColumn<Department>[]>(() => [
  { accessorKey: 'name', header: sortHeader(t('departments.name'), 'name') },
  { accessorKey: 'code', header: t('departments.code') },
  { accessorKey: 'queuePrefix', header: t('departments.queuePrefix') },
  { accessorKey: 'servicesCount', header: t('departments.servicesCount') },
  { accessorKey: 'sortOrder', header: sortHeader(t('departments.sortOrder'), 'sortOrder') },
  { accessorKey: 'isActive', header: t('common.status') },
  { id: 'actions', header: '' },
])
const activeOptions = computed(() => [
  { value: 'true', label: t('common.active') },
  { value: 'false', label: t('common.inactive') },
])

interface DeptForm {
  name: string
  nameRu: string
  code: string
  queuePrefix: string
  description: string
  sortOrder: number
  isActive: boolean
}
const open = ref(false)
const editing = ref<Department | null>(null)
const saving = ref(false)
const form = reactive<DeptForm>({ name: '', nameRu: '', code: '', queuePrefix: '', description: '', sortOrder: 0, isActive: true })

function openForm(d: Department | null) {
  editing.value = d
  Object.assign(form, {
    name: d?.name ?? '',
    nameRu: d?.nameRu ?? '',
    code: d?.code ?? '',
    queuePrefix: d?.queuePrefix ?? '',
    description: d?.description ?? '',
    sortOrder: d?.sortOrder ?? list.meta.value.total,
    isActive: d?.isActive ?? true,
  })
  open.value = true
}

function validate(s: DeptForm): FormError[] {
  const e: FormError[] = []
  if (!s.name.trim()) e.push({ name: 'name', message: t('validation.required') })
  if (!/^[A-Z0-9-]{2,20}$/.test(s.code.trim().toUpperCase())) e.push({ name: 'code', message: t('departments.codeRule') })
  if (!/^[A-Z]{1,3}$/.test(s.queuePrefix.trim().toUpperCase())) e.push({ name: 'queuePrefix', message: t('departments.prefixRule') })
  return e
}

async function save() {
  saving.value = true
  try {
    const body = {
      name: form.name.trim(),
      nameRu: form.nameRu.trim() || null,
      code: form.code.trim().toUpperCase(),
      queuePrefix: form.queuePrefix.trim().toUpperCase(),
      description: form.description.trim() || null,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    }
    if (editing.value) await api.patch(`/departments/${editing.value.id}`, body)
    else await api.post('/departments', body)
    toast.add({ title: editing.value ? t('toast.departmentUpdated') : t('toast.departmentCreated'), color: 'success', icon: 'i-lucide-check' })
    open.value = false
    lookups.invalidate()
    void list.refresh()
  } finally {
    saving.value = false
  }
}

async function deactivate(d: Department) {
  const r = await confirm({ title: t('departments.deactivateTitle', { name: d.name }), description: t('departments.deactivateDescription'), color: 'error', confirmLabel: t('common.deactivate') })
  if (!r.confirmed) return
  await api.del(`/departments/${d.id}`)
  toast.add({ title: t('toast.departmentDeactivated'), color: 'success', icon: 'i-lucide-check' })
  lookups.invalidate()
  void list.refresh()
}

async function activate(d: Department) {
  await api.patch(`/departments/${d.id}`, { isActive: true })
  toast.add({ title: t('toast.departmentUpdated'), color: 'success', icon: 'i-lucide-check' })
  void list.refresh()
}
</script>

<template>
  <AppPage :title="t('nav.departments')" :description="t('departments.subtitle')">
    <ListToolbar v-model:search="list.search.value" :active-filters="list.activeFilterCount.value" @reset="list.resetFilters">
      <template #filters>
        <FilterSelect v-model="list.filters.isActive" :items="activeOptions" icon="i-lucide-toggle-left" />
      </template>
      <template #actions>
        <UButton icon="i-lucide-plus" :label="t('departments.create')" @click="openForm(null)" />
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
      empty-icon="i-lucide-building-2"
      @retry="list.refresh"
    >
      <template #name-cell="{ row }">
        <p class="font-medium text-highlighted">{{ row.original.name }}</p>
        <p v-if="row.original.nameRu" class="text-xs text-muted">{{ row.original.nameRu }}</p>
      </template>
      <template #code-cell="{ row }"><UBadge color="neutral" variant="soft" class="font-mono">{{ row.original.code }}</UBadge></template>
      <template #queuePrefix-cell="{ row }"><span class="font-mono text-lg font-bold text-primary">{{ row.original.queuePrefix }}</span></template>
      <template #servicesCount-cell="{ row }">{{ row.original.servicesCount ?? '—' }}</template>
      <template #isActive-cell="{ row }">
        <UBadge :color="row.original.isActive ? 'success' : 'neutral'" variant="subtle">{{ row.original.isActive ? t('common.active') : t('common.inactive') }}</UBadge>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UButton color="neutral" variant="ghost" icon="i-lucide-pencil" :aria-label="t('common.edit')" @click="openForm(row.original)" />
          <UButton v-if="row.original.isActive" color="error" variant="ghost" icon="i-lucide-power" :aria-label="t('common.deactivate')" @click="deactivate(row.original)" />
          <UButton v-else color="success" variant="ghost" icon="i-lucide-power" :aria-label="t('common.activate')" @click="activate(row.original)" />
        </div>
      </template>
    </DataTable>

    <UModal v-model:open="open" :title="editing ? t('departments.edit') : t('departments.create')">
      <template #body>
        <UForm id="dept-form" :state="form" :validate="validate" class="grid gap-4 sm:grid-cols-2" @submit="save">
          <UFormField :label="t('departments.nameUz')" name="name" required class="sm:col-span-2">
            <UInput v-model="form.name" class="w-full" />
          </UFormField>
          <UFormField :label="t('departments.nameRu')" name="nameRu" class="sm:col-span-2">
            <UInput v-model="form.nameRu" class="w-full" />
          </UFormField>
          <UFormField :label="t('departments.code')" name="code" required :hint="t('departments.codeHint')">
            <UInput v-model="form.code" class="w-full font-mono uppercase" />
          </UFormField>
          <UFormField :label="t('departments.queuePrefix')" name="queuePrefix" required :hint="t('departments.prefixHint')">
            <UInput v-model="form.queuePrefix" maxlength="3" class="w-full font-mono uppercase" />
          </UFormField>
          <UFormField :label="t('departments.sortOrder')" name="sortOrder">
            <UInputNumber v-model="form.sortOrder" :min="0" class="w-full" />
          </UFormField>
          <UFormField :label="t('common.status')" name="isActive">
            <USwitch v-model="form.isActive" :label="form.isActive ? t('common.active') : t('common.inactive')" class="mt-1.5" />
          </UFormField>
          <UFormField :label="t('common.description')" name="description" class="sm:col-span-2">
            <UTextarea v-model="form.description" :rows="3" class="w-full" />
          </UFormField>
        </UForm>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" :label="t('common.cancel')" @click="open = false" />
          <UButton type="submit" form="dept-form" :loading="saving" icon="i-lucide-save" :label="t('common.save')" />
        </div>
      </template>
    </UModal>
  </AppPage>
</template>
