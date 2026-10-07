<script setup lang="ts">
/** Field-by-field comparison of audit old/new values. */
const props = defineProps<{ oldValue: Record<string, unknown> | null; newValue: Record<string, unknown> | null }>()
const { t } = useI18n()

function show(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'string') return v.startsWith('data:image') ? t('audit.image') : v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(v)
}

const rows = computed(() => {
  const keys = new Set([...Object.keys(props.oldValue ?? {}), ...Object.keys(props.newValue ?? {})])
  return [...keys].map((key) => {
    const before = props.oldValue?.[key]
    const after = props.newValue?.[key]
    return { key, before: show(before), after: show(after), changed: JSON.stringify(before) !== JSON.stringify(after) }
  })
})
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-default">
    <table class="w-full text-sm">
      <thead class="bg-elevated/50 text-xs uppercase text-muted">
        <tr>
          <th class="px-3 py-2 text-left font-medium">{{ t('audit.field') }}</th>
          <th class="px-3 py-2 text-left font-medium">{{ t('audit.oldValue') }}</th>
          <th class="px-3 py-2 text-left font-medium">{{ t('audit.newValue') }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-default">
        <tr v-for="r in rows" :key="r.key" :class="r.changed ? '' : 'opacity-60'">
          <td class="px-3 py-2 font-mono text-xs">{{ r.key }}</td>
          <td class="px-3 py-2 break-all" :class="r.changed && props.oldValue ? 'bg-error/5 text-error' : ''">{{ props.oldValue ? r.before : '—' }}</td>
          <td class="px-3 py-2 break-all" :class="r.changed && props.newValue ? 'bg-success/5 text-success' : ''">{{ props.newValue ? r.after : '—' }}</td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="3" class="px-3 py-4 text-center text-muted">{{ t('audit.noChanges') }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
