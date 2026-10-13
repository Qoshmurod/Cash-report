<script setup lang="ts">
import type { KioskCatalogDepartment, Service } from '~/types/api'

/** Department → services picker with search; v-model is the list of selected service ids. */
const props = defineProps<{ departments: KioskCatalogDepartment[]; loading?: boolean }>()
const selected = defineModel<string[]>({ default: () => [] })
const { t, locale } = useI18n()
const search = ref('')
const activeDep = ref<string | undefined>()

watch(
  () => props.departments,
  (deps) => {
    if (!activeDep.value && deps[0]) activeDep.value = deps[0].id
  },
  { immediate: true },
)

const name = (x: { name: string; nameRu: string | null }) => (locale.value === 'ru' && x.nameRu ? x.nameRu : x.name)
const visible = computed<Service[]>(() => {
  const q = search.value.trim().toLowerCase()
  if (q) {
    return props.departments.flatMap((d) => d.services).filter((s) => `${s.name} ${s.nameRu ?? ''} ${s.code}`.toLowerCase().includes(q))
  }
  return props.departments.find((d) => d.id === activeDep.value)?.services ?? []
})

function toggle(id: string) {
  selected.value = selected.value.includes(id) ? selected.value.filter((x) => x !== id) : [...selected.value, id]
}
const countIn = (d: KioskCatalogDepartment) => d.services.filter((s) => selected.value.includes(s.id)).length
</script>

<template>
  <div class="space-y-3">
    <UInput v-model="search" icon="i-lucide-search" :placeholder="t('services.searchPlaceholder')" class="w-full" />
    <div v-if="props.loading" class="space-y-2">
      <USkeleton v-for="i in 6" :key="i" class="h-12" />
    </div>
    <div v-else class="grid gap-3 md:grid-cols-[200px_1fr]">
      <nav v-if="!search" class="flex gap-1 overflow-x-auto md:flex-col" :aria-label="t('services.department')">
        <UButton
          v-for="d in props.departments"
          :key="d.id"
          :color="activeDep === d.id ? 'primary' : 'neutral'"
          :variant="activeDep === d.id ? 'soft' : 'ghost'"
          class="shrink-0 justify-between"
          @click="activeDep = d.id"
        >
          <span class="truncate">{{ name(d) }}</span>
          <UBadge v-if="countIn(d)" size="sm" color="primary">{{ countIn(d) }}</UBadge>
        </UButton>
      </nav>
      <div class="space-y-2" :class="search ? 'md:col-span-2' : ''">
        <button
          v-for="s in visible"
          :key="s.id"
          type="button"
          class="flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-primary"
          :class="selected.includes(s.id) ? 'border-primary bg-primary/5' : 'border-default hover:bg-elevated/50'"
          :aria-pressed="selected.includes(s.id)"
          @click="toggle(s.id)"
        >
          <span class="flex min-w-0 items-center gap-3">
            <UCheckbox :model-value="selected.includes(s.id)" tabindex="-1" aria-hidden="true" class="pointer-events-none" />
            <span class="min-w-0">
              <span class="block truncate font-medium">{{ name(s) }}</span>
              <span class="block text-xs text-muted">{{ s.code }} · {{ t('services.minutes', { n: s.durationMinutes }) }}</span>
            </span>
          </span>
          <MoneyText :value="s.price" class="font-semibold" />
        </button>
        <EmptyState v-if="!visible.length" :title="t('services.notFound')" icon="i-lucide-search-x" compact />
      </div>
    </div>
  </div>
</template>
