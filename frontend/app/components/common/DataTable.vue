<script setup lang="ts" generic="T extends object">
import type { TableColumn } from '@nuxt/ui'
import type { PageMeta } from '~/types/api'
import type { ApiError } from '~/utils/api-error'
import { PAGE_SIZE_OPTIONS } from '~/utils/constants'

const props = withDefaults(
  defineProps<{
    data: T[]
    columns: TableColumn<T>[]
    loading?: boolean
    error?: ApiError | null
    meta?: PageMeta
    emptyTitle?: string
    emptyDescription?: string
    emptyIcon?: string
    skeletonRows?: number
    paginate?: boolean
    rowClickable?: boolean
  }>(),
  { skeletonRows: 8, paginate: true },
)
const page = defineModel<number>('page', { default: 1 })
const limit = defineModel<number>('limit', { default: 20 })
const emit = defineEmits<{ retry: []; rowClick: [T] }>()
const slots = useSlots()
const { t } = useI18n()

const cellSlots = computed(() => Object.keys(slots).filter((n) => n.endsWith('-cell') || n.endsWith('-header') || n === 'expanded'))
const showSkeleton = computed(() => props.loading && props.data.length === 0)
const range = computed(() => {
  if (!props.meta || props.meta.total === 0) return { from: 0, to: 0, total: 0 }
  const from = (props.meta.page - 1) * props.meta.limit + 1
  return { from, to: Math.min(props.meta.total, from + props.data.length - 1), total: props.meta.total }
})
const limitItems = PAGE_SIZE_OPTIONS.map((n) => ({ label: String(n), value: n }))

function onSelect(_e: Event, row: { original: T }) {
  if (props.rowClickable) emit('rowClick', row.original)
}
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-default bg-default">
    <ErrorState v-if="props.error && !props.loading" :error="props.error" @retry="emit('retry')" />
    <div v-else-if="showSkeleton" class="divide-y divide-default" aria-busy="true">
      <div v-for="i in props.skeletonRows" :key="i" class="flex items-center gap-4 px-4 py-3.5">
        <USkeleton class="size-8 rounded-full" />
        <USkeleton class="h-4 flex-1" />
        <USkeleton class="hidden h-4 w-32 sm:block" />
        <USkeleton class="hidden h-4 w-24 md:block" />
      </div>
    </div>
    <template v-else>
      <UTable
        :data="props.data"
        :columns="props.columns"
        :loading="props.loading"
        loading-animation="carousel"
        sticky="header"
        :class="props.rowClickable ? '[&_tbody_tr]:cursor-pointer' : ''"
        :ui="{ th: 'text-xs uppercase tracking-wide text-muted font-medium bg-elevated/40', td: 'text-sm' }"
        @select="onSelect"
      >
        <template #empty>
          <EmptyState :title="props.emptyTitle" :description="props.emptyDescription" :icon="props.emptyIcon" compact />
        </template>
        <template v-for="name in cellSlots" #[name]="slotData" :key="name">
          <slot :name="name" v-bind="slotData ?? {}" />
        </template>
      </UTable>
      <div
        v-if="props.paginate && props.meta && props.meta.total > 0"
        class="flex flex-col items-center justify-between gap-3 border-t border-default px-4 py-3 sm:flex-row"
      >
        <div class="flex items-center gap-3 text-sm text-muted">
          <span class="tabular">{{ t('table.range', range) }}</span>
          <USelect v-model="limit" :items="limitItems" size="xs" class="w-20" :aria-label="t('table.perPage')" />
        </div>
        <UPagination v-model:page="page" :total="props.meta.total" :items-per-page="props.meta.limit" size="sm" show-edges :sibling-count="1" />
      </div>
    </template>
  </div>
</template>
