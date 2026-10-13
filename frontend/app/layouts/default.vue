<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { STORAGE_KEYS } from '~/utils/constants'
import { MENU } from '~/utils/sections'

const auth = useAuthStore()
const { t } = useI18n()
const open = ref(false)
const collapsed = useLocalStorage(STORAGE_KEYS.sidebarCollapsed, false)

// Contracts whose balance fell to the warning threshold → badge on the menu item
const api = useApi()
const lowContracts = ref(0)
async function loadLowContracts() {
  if (!auth.can('contracts', 'registration')) return
  try {
    lowContracts.value = (await api.get<{ count: number }>('/contracts/low-balance-count')).count
  } catch {
    lowContracts.value = 0
  }
}
onMounted(loadLowContracts)
useRealtime().on('payment:updated', () => void loadLowContracts())
const contractsExtra = computed<Partial<NavigationMenuItem>>(() =>
  lowContracts.value ? { badge: { label: String(lowContracts.value), color: 'warning', variant: 'solid', size: 'sm' } } : {},
)

const menu = computed<NavigationMenuItem[][]>(() => {
  const close = () => {
    open.value = false
  }
  const groups: NavigationMenuItem[][] = []
  for (const m of MENU) {
    if (!auth.can(m.section)) continue
    if (m.key === 'permissions' && auth.can('staff')) continue // same page as Xodimlar
    const extra: Partial<NavigationMenuItem> = m.key === 'contracts' ? contractsExtra.value : {}
    ;(groups[m.group] ??= []).push({ label: t(m.labelKey), icon: m.icon, to: m.to, exact: m.exact, onSelect: close, ...extra })
  }
  const result = groups.filter((g) => g?.length)
  result.push([
    { label: t('nav.profile'), icon: 'i-lucide-user-round', to: '/profile', onSelect: close },
    { label: t('nav.display'), icon: 'i-lucide-monitor', to: '/display', target: '_blank', onSelect: close },
  ])
  return result
})
</script>

<template>
  <UDashboardGroup unit="rem" storage="local" storage-key="shifoxona-dashboard">
    <UDashboardSidebar
      id="main"
      v-model:open="open"
      v-model:collapsed="collapsed"
      collapsible
      resizable
      :min-size="14"
      :default-size="16"
      :max-size="20"
      class="bg-elevated/30"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed: isCollapsed }">
        <NuxtLink :to="auth.homePath" class="min-w-0" :aria-label="t('nav.home')">
          <AppLogo :collapsed="isCollapsed" />
        </NuxtLink>
      </template>

      <template #default="{ collapsed: isCollapsed }">
        <nav :aria-label="t('nav.main')" class="flex flex-col gap-1">
          <template v-for="(group, gi) in menu" :key="gi">
            <USeparator v-if="gi > 0" class="my-1.5" />
            <UNavigationMenu :collapsed="isCollapsed" :items="group" orientation="vertical" tooltip popover />
          </template>
        </nav>
      </template>

      <template #footer="{ collapsed: isCollapsed }">
        <UserMenu :collapsed="isCollapsed" />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
