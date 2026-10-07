<script setup lang="ts">
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_DIMENSION } from '~/utils/constants'

const props = withDefaults(defineProps<{ name?: string; size?: '3xl' | 'xl' | '2xl'; square?: boolean }>(), { size: '3xl' })
const model = defineModel<string | null>({ default: null })
const { t } = useI18n()
const toast = useToast()
const input = ref<HTMLInputElement | null>(null)
const busy = ref(false)

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('invalid image'))
    }
    img.src = url
  })
}

/** Resize to MAX_IMAGE_DIMENSION and re-encode as WebP/JPEG until the data URL fits MAX_IMAGE_BYTES. */
async function compress(file: File): Promise<string> {
  const img = await loadImage(file)
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const type = file.type === 'image/png' && props.square ? 'image/png' : 'image/jpeg'
  for (const quality of [0.9, 0.8, 0.7, 0.55, 0.4]) {
    const data = canvas.toDataURL(type, quality)
    const bytes = Math.ceil(((data.length - data.indexOf(',') - 1) * 3) / 4)
    if (bytes <= MAX_IMAGE_BYTES) return data
  }
  throw new Error('too large')
}

async function onChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (input.value) input.value.value = ''
  if (!file) return
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    toast.add({ title: t('avatar.invalidType'), color: 'error', icon: 'i-lucide-image-off' })
    return
  }
  busy.value = true
  try {
    model.value = await compress(file)
  } catch {
    toast.add({ title: t('avatar.tooLarge'), color: 'error', icon: 'i-lucide-image-off' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex items-center gap-4">
    <div v-if="props.square" class="grid size-20 place-items-center overflow-hidden rounded-xl border border-default bg-elevated">
      <img v-if="model" :src="model" :alt="props.name ?? ''" class="size-full object-contain" >
      <UIcon v-else name="i-lucide-image" class="size-8 text-dimmed" />
    </div>
    <UAvatar v-else :src="model ?? undefined" :alt="props.name" :size="props.size" icon="i-lucide-user" />
    <div class="flex flex-col gap-2">
      <div class="flex gap-2">
        <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-upload" :loading="busy" :label="t('avatar.upload')" @click="input?.click()" />
        <UButton v-if="model" size="sm" color="error" variant="ghost" icon="i-lucide-trash-2" :label="t('avatar.remove')" @click="model = null" />
      </div>
      <p class="text-xs text-dimmed">{{ t('avatar.hint') }}</p>
    </div>
    <input ref="input" type="file" class="hidden" :accept="ALLOWED_IMAGE_TYPES.join(',')" @change="onChange" >
  </div>
</template>
