<script setup lang="ts">
import type { ConfirmOptions, ConfirmResult } from '~/composables/useConfirm'

const props = defineProps<ConfirmOptions>()
const emit = defineEmits<{ close: [ConfirmResult] }>()
const { t } = useI18n()
const value = ref('')
const invalid = computed(() => !!props.inputLabel && props.inputRequired === true && !value.value.trim())

function submit() {
  if (invalid.value) return
  emit('close', { confirmed: true, value: value.value.trim() })
}
</script>

<template>
  <UModal :title="props.title" :description="props.description" :dismissible="true" @update:open="(o: boolean) => !o && emit('close', { confirmed: false })">
    <template v-if="props.inputLabel" #body>
      <UFormField :label="props.inputLabel" :required="props.inputRequired">
        <UTextarea v-model="value" autofocus :rows="3" class="w-full" @keydown.meta.enter="submit" />
      </UFormField>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" :label="props.cancelLabel ?? t('common.cancel')" @click="emit('close', { confirmed: false })" />
        <UButton
          :color="props.color ?? 'primary'"
          :icon="props.icon"
          :disabled="invalid"
          :label="props.confirmLabel ?? t('common.confirm')"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>
