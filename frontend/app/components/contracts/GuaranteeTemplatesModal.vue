<script setup lang="ts">
import type { GuaranteeTemplate } from '~/types/api'

/** Kafolat xati namunalari — managed by users with "contract_credit_approve". */
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const api = useApi()
const toast = useToast()
const { formatDateTime } = useDate()

const PLACEHOLDERS = ['{shartnoma_raqami}', '{tashkilot}', '{summa}', '{shartnoma_summasi}', '{xat_raqami}', '{sana}']
const items = ref<GuaranteeTemplate[]>([])
const editing = ref<GuaranteeTemplate | null>(null)
const form = reactive({ name: '', body: '', isActive: true })
const busy = ref(false)

async function load() {
  items.value = await api.get<GuaranteeTemplate[]>('/contracts/guarantee-templates')
}
watch(open, (v) => {
  if (v) {
    editing.value = null
    void load()
  }
})
function edit(x: GuaranteeTemplate | null) {
  editing.value = x ?? ({ id: '' } as GuaranteeTemplate)
  Object.assign(form, { name: x?.name ?? '', body: x?.body ?? '', isActive: x?.isActive ?? true })
}
function insert(ph: string) {
  form.body = `${form.body}${form.body && !form.body.endsWith(' ') && !form.body.endsWith('\n') ? ' ' : ''}${ph}`
}
async function save() {
  busy.value = true
  try {
    const body = { name: form.name.trim(), body: form.body, isActive: form.isActive }
    if (editing.value?.id) await api.patch(`/contracts/guarantee-templates/${editing.value.id}`, body)
    else await api.post('/contracts/guarantee-templates', body)
    toast.add({ title: t('guarantees.templateSaved'), color: 'success', icon: 'i-lucide-check' })
    editing.value = null
    await load()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="t('guarantees.templates')" :description="t('guarantees.templatesHint')" :ui="{ content: 'max-w-3xl' }">
    <template #body>
      <div v-if="!editing" class="space-y-3">
        <div class="flex justify-end">
          <UButton icon="i-lucide-plus" :label="t('guarantees.newTemplate')" @click="edit(null)" />
        </div>
        <ul v-if="items.length" class="divide-y divide-default rounded-lg border border-default">
          <li v-for="x in items" :key="x.id" class="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
            <div class="min-w-0">
              <p class="truncate font-medium">{{ x.name }}</p>
              <p class="text-xs text-muted">{{ formatDateTime(x.createdAt) }}</p>
            </div>
            <div class="flex items-center gap-2">
              <UBadge :color="x.isActive ? 'success' : 'neutral'" variant="subtle">{{ x.isActive ? t('contracts.active') : t('contracts.inactive') }}</UBadge>
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-pencil" :aria-label="t('common.edit')" @click="edit(x)" />
            </div>
          </li>
        </ul>
        <EmptyState v-else icon="i-lucide-file-text" :title="t('guarantees.noTemplates')" />
      </div>
      <div v-else class="space-y-3">
        <UFormField :label="t('guarantees.templateName')" required>
          <UInput id="gt-name" v-model="form.name" class="w-full" />
        </UFormField>
        <UFormField :label="t('guarantees.templateBody')" required :hint="t('guarantees.templateBodyHint')">
          <UTextarea id="gt-body" v-model="form.body" :rows="10" class="w-full font-mono text-xs" />
        </UFormField>
        <div class="flex flex-wrap gap-1.5">
          <UButton v-for="ph in PLACEHOLDERS" :key="ph" size="xs" color="neutral" variant="outline" :label="ph" @click="insert(ph)" />
        </div>
        <USwitch id="gt-active" v-model="form.isActive" :label="form.isActive ? t('contracts.active') : t('contracts.inactive')" />
      </div>
    </template>
    <template v-if="editing" #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" :label="t('common.back')" @click="editing = null" />
        <UButton :loading="busy" :disabled="form.name.trim().length < 2 || form.body.trim().length < 10" icon="i-lucide-check" :label="t('common.save')" @click="save" />
      </div>
    </template>
  </UModal>
</template>
