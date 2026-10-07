<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Patient } from '~/types/api'

const props = defineProps<{ detailBase: string; exportable?: boolean }>()
const { t } = useI18n()
const labels = useLabels()
const { formatDate, age } = useDate()
const router = useRouter()

const list = usePaginatedList<
  Patient,
  { gender: string | undefined; ageFrom: string | undefined; ageTo: string | undefined; dateFrom: string | undefined; dateTo: string | undefined }
>('/patients', { filters: { gender: undefined, ageFrom: undefined, ageTo: undefined, dateFrom: undefined, dateTo: undefined } })
const sortHeader = useSortHeader(list)
const createOpen = ref(false)

const columns = computed<TableColumn<Patient>[]>(() => [
  { id: 'name', header: sortHeader(t('patients.patient'), 'lastName') },
  { accessorKey: 'patientCode', header: t('patients.code') },
  { accessorKey: 'phone', header: t('person.phone') },
  { accessorKey: 'birthDate', header: t('person.birthDate') },
  { accessorKey: 'gender', header: t('person.gender') },
  { accessorKey: 'createdAt', header: sortHeader(t('common.createdAt'), 'createdAt') },
])

function onSaved(p: Patient) {
  void router.push(`${props.detailBase}/${p.id}`)
}
</script>

<template>
  <div>
    <ListToolbar v-model:search="list.search.value" :search-placeholder="t('patients.searchPlaceholder')" :active-filters="list.activeFilterCount.value" @reset="list.resetFilters">
      <template #filters>
        <FilterSelect v-model="list.filters.gender" :items="labels.genderOptions.value" icon="i-lucide-venus-and-mars" />
        <UInput v-model="list.filters.ageFrom" type="number" min="0" class="w-24" :placeholder="t('patients.ageFrom')" :aria-label="t('patients.ageFrom')" />
        <UInput v-model="list.filters.ageTo" type="number" min="0" class="w-24" :placeholder="t('patients.ageTo')" :aria-label="t('patients.ageTo')" />
        <UInput v-model="list.filters.dateFrom" type="date" :aria-label="t('common.dateFrom')" />
        <UInput v-model="list.filters.dateTo" type="date" :aria-label="t('common.dateTo')" />
      </template>
      <template #actions>
        <ExportMenu v-if="props.exportable" type="patients" :query="list.query.value" />
        <UButton icon="i-lucide-user-plus" :label="t('patients.create')" @click="createOpen = true" />
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
      :empty-title="t('patients.empty')"
      empty-icon="i-lucide-users"
      row-clickable
      @retry="list.refresh"
      @row-click="(p) => router.push(`${props.detailBase}/${p.id}`)"
    >
      <template #name-cell="{ row }">
        <div class="flex items-center gap-3">
          <UAvatar :src="row.original.avatar ?? undefined" :alt="personName(row.original)" size="sm" />
          <div class="leading-tight">
            <p class="font-medium text-highlighted">{{ personName(row.original) }}</p>
            <p v-if="row.original.middleName" class="text-xs text-muted">{{ row.original.middleName }}</p>
          </div>
        </div>
      </template>
      <template #patientCode-cell="{ row }">
        <UBadge color="neutral" variant="soft" class="font-mono">{{ row.original.patientCode }}</UBadge>
      </template>
      <template #phone-cell="{ row }">
        <span class="tabular">{{ row.original.phone ?? '—' }}</span>
      </template>
      <template #birthDate-cell="{ row }">
        <span class="tabular">{{ formatDate(row.original.birthDate) }}</span>
        <span v-if="age(row.original.birthDate) !== null" class="ml-1 text-xs text-muted">({{ t('patients.years', { n: age(row.original.birthDate) }) }})</span>
      </template>
      <template #gender-cell="{ row }">{{ labels.gender(row.original.gender) }}</template>
      <template #createdAt-cell="{ row }">
        <span class="tabular text-muted">{{ formatDate(row.original.createdAt) }}</span>
      </template>
    </DataTable>

    <PatientFormSlideover v-model:open="createOpen" @saved="onSaved" />
  </div>
</template>
