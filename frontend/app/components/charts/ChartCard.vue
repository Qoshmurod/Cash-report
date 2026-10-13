<script setup lang="ts">
import VChart from 'vue-echarts'
import type { EChartsCoreOption } from 'echarts/core'

const props = withDefaults(
  defineProps<{ title: string; description?: string; option: EChartsCoreOption; loading?: boolean; empty?: boolean; height?: string }>(),
  { height: '300px' },
)
const { t } = useI18n()
</script>

<template>
  <PageSection :title="props.title" :description="props.description">
    <template v-if="$slots.actions" #actions>
      <slot name="actions" />
    </template>
    <div :style="{ height: props.height }" class="relative">
      <USkeleton v-if="props.loading" class="size-full" />
      <EmptyState v-else-if="props.empty" :title="t('common.noData')" icon="i-lucide-chart-no-axes-column" compact class="h-full" />
      <ClientOnly v-else>
        <VChart :option="props.option" autoresize class="size-full" :aria-label="props.title" role="img" />
      </ClientOnly>
    </div>
  </PageSection>
</template>
