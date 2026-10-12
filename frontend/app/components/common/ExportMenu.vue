<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { ExportFormat, ReportType } from '~/types/api'
import type { QueryParams } from '~/composables/useApi'

const props = defineProps<{ type: ReportType; query: QueryParams }>()
const { t } = useI18n()
const toast = useToast()
const { downloading, download } = useApiDownload()

async function run(format: ExportFormat) {
  const { page: _page, limit: _limit, ...filters } = props.query
  await download(`/reports/export/${props.type}`, { ...filters, format }, `${props.type}.${format}`)
  toast.add({ title: t('toast.exported'), color: 'success', icon: 'i-lucide-download' })
}

const items = computed<DropdownMenuItem[]>(() => [
  { label: t('export.excel'), icon: 'i-lucide-file-spreadsheet', onSelect: () => void run('xlsx') },
  { label: t('export.pdf'), icon: 'i-lucide-file-text', onSelect: () => void run('pdf') },
])
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }">
    <UButton color="neutral" variant="outline" icon="i-lucide-download" :loading="downloading" :label="t('export.label')" />
  </UDropdownMenu>
</template>
