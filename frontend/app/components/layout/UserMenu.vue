<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const props = defineProps<{ collapsed?: boolean }>()
const auth = useAuthStore()
const { t } = useI18n()
const labels = useLabels()
const logout = useLogout()

const items = computed<DropdownMenuItem[][]>(() => [
  [{ type: 'label', label: auth.fullName, avatar: { src: auth.user?.avatar ?? undefined, icon: 'i-lucide-user' } }],
  [{ label: t('nav.profile'), icon: 'i-lucide-user-round', to: '/profile' }],
  [{ label: t('auth.logout'), icon: 'i-lucide-log-out', color: 'error', onSelect: () => void logout() }],
])
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'center', collisionPadding: 12 }" :ui="{ content: props.collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }">
    <UButton
      color="neutral"
      variant="ghost"
      block
      :square="props.collapsed"
      class="data-[state=open]:bg-elevated"
      :ui="{ trailingIcon: 'text-dimmed' }"
      :trailing-icon="props.collapsed ? undefined : 'i-lucide-chevrons-up-down'"
    >
      <UAvatar :src="auth.user?.avatar ?? undefined" :alt="auth.fullName" icon="i-lucide-user" size="sm" />
      <span v-if="!props.collapsed" class="min-w-0 flex-1 text-left leading-tight">
        <span class="block truncate text-sm font-medium text-highlighted">{{ auth.fullName }}</span>
        <span class="block truncate text-xs text-muted">{{ auth.role ? labels.role(auth.role) : '' }}</span>
      </span>
    </UButton>
  </UDropdownMenu>
</template>
