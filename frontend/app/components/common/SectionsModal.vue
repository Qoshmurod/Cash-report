<script setup lang="ts">
import type { User } from '~/types/api'
import { NON_DELEGABLE, SECTION_KEYS } from '~/utils/sections'

/**
 * Bo'limlarga ruxsat.
 *  - Super admin: any bo'lim; for a user with "Ruxsatlarni belgilash" also chooses which bo'limlar
 *    that user may hand out to others.
 *  - Delegate ("permissions" section): may only switch the bo'limlar the super admin approved for them.
 */
const props = defineProps<{ user: User | null }>()
const emit = defineEmits<{ close: []; saved: [User] }>()
const { t } = useI18n()
const api = useApi()
const auth = useAuthStore()
const toast = useToast()
const labels = useLabels()

const open = computed({
  get: () => !!props.user,
  set: (v: boolean) => {
    if (!v) emit('close')
  },
})
const isSuper = computed(() => auth.isSuperAdmin)
/** Keys the current editor may switch. */
const editable = computed<string[]>(() =>
  isSuper.value ? SECTION_KEYS : auth.grantable.filter((k) => !(NON_DELEGABLE as string[]).includes(k)),
)
const selected = ref<string[]>([])
const grantable = ref<string[]>([])
const custom = ref(false)
const busy = ref(false)
watch(
  () => props.user,
  (u) => {
    if (!u) return
    custom.value = Array.isArray(u.allowedSections)
    selected.value = [...(u.allowedSections ?? u.sections ?? [])]
    grantable.value = [...(u.grantableSections ?? [])]
  },
  { immediate: true },
)
const flip = (list: string[], key: string, on: boolean | 'indeterminate') => (on === true ? [...new Set([...list, key])] : list.filter((k) => k !== key))
function toggleSection(key: string, on: boolean | 'indeterminate') {
  selected.value = flip(selected.value, key, on)
  custom.value = true
}
function toggleGrantable(key: string, on: boolean | 'indeterminate') {
  grantable.value = flip(grantable.value, key, on)
}
const showGrantable = computed(() => isSuper.value && selected.value.includes('permissions'))
const delegableKeys = computed(() => SECTION_KEYS.filter((k) => !(NON_DELEGABLE as string[]).includes(k)))

async function save(useDefaults = false) {
  if (!props.user) return
  busy.value = true
  try {
    let u = await api.put<User>(`/users/${props.user.id}/sections`, { sections: useDefaults ? null : selected.value })
    if (isSuper.value) {
      u = await api.put<User>(`/users/${props.user.id}/grantable-sections`, { sections: showGrantable.value ? grantable.value : [] })
    }
    toast.add({ title: t('sections.saved'), color: 'success', icon: 'i-lucide-check' })
    emit('saved', u)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('sections.title', { name: personName(props.user) })"
    :description="props.user ? labels.role(props.user.role) : ''"
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <p class="text-sm text-muted">{{ isSuper ? t('sections.hint') : t('sections.delegateHint') }}</p>
        <UBadge v-if="!custom" color="info" variant="subtle" icon="i-lucide-info">{{ t('sections.usingDefaults') }}</UBadge>
        <UAlert v-if="!isSuper && !editable.length" color="warning" variant="subtle" icon="i-lucide-lock" :title="t('sections.nothingToGrant')" />
        <div class="grid gap-2 sm:grid-cols-2">
          <UCheckbox
            v-for="key in SECTION_KEYS"
            :id="`sec-${key}`"
            :key="key"
            :model-value="selected.includes(key)"
            :disabled="!editable.includes(key)"
            :label="t(`sections.${key}`)"
            @update:model-value="(v) => toggleSection(key, v)"
          />
        </div>

        <div v-if="showGrantable" class="space-y-2 rounded-lg border border-default p-3">
          <p class="text-sm font-semibold text-highlighted">{{ t('sections.grantableTitle') }}</p>
          <p class="text-xs text-muted">{{ t('sections.grantableHint') }}</p>
          <div class="grid gap-2 sm:grid-cols-2">
            <UCheckbox
              v-for="key in delegableKeys"
              :id="`grant-${key}`"
              :key="key"
              :model-value="grantable.includes(key)"
              :label="t(`sections.${key}`)"
              @update:model-value="(v) => toggleGrantable(key, v)"
            />
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full flex-wrap justify-between gap-2">
        <UButton v-if="isSuper" color="neutral" variant="ghost" icon="i-lucide-rotate-ccw" :loading="busy" :label="t('sections.reset')" @click="save(true)" />
        <span v-else />
        <div class="flex gap-2">
          <UButton color="neutral" variant="ghost" :label="t('common.cancel')" @click="emit('close')" />
          <UButton icon="i-lucide-check" :loading="busy" :disabled="!isSuper && !editable.length" :label="t('common.save')" @click="save(false)" />
        </div>
      </div>
    </template>
  </UModal>
</template>
