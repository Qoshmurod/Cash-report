<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { STORAGE_KEYS } from '~/utils/constants'

const auth = useAuthStore()
const { t } = useI18n()
const open = ref(false)
const collapsed = useLocalStorage(STORAGE_KEYS.sidebarCollapsed, false)

const menu = computed<NavigationMenuItem[][]>(() => {
  const close = () => {
    open.value = false
  }
  const item = (label: string, icon: string, to: string, extra: Partial<NavigationMenuItem> = {}): NavigationMenuItem => ({
    label,
    icon,
    to,
    onSelect: close,
    ...extra,
  })

  switch (auth.role) {
    case 'ADMIN':
      return [
        [item(t('nav.dashboard'), 'i-lucide-layout-dashboard', '/admin', { exact: true })],
        [
          item(t('nav.patients'), 'i-lucide-users', '/admin/patients'),
          item(t('nav.staff'), 'i-lucide-id-card', '/admin/staff'),
          item(t('nav.doctors'), 'i-lucide-stethoscope', '/admin/doctors'),
        ],
        [
          item(t('nav.departments'), 'i-lucide-building-2', '/admin/departments'),
          item(t('nav.services'), 'i-lucide-clipboard-list', '/admin/services'),
        ],
        [
          item(t('nav.queues'), 'i-lucide-list-ordered', '/admin/queues'),
          item(t('nav.payments'), 'i-lucide-wallet', '/admin/payments'),
          item(t('nav.registration'), 'i-lucide-clipboard-plus', '/registrar'),
        ],
        [item(t('nav.reports'), 'i-lucide-chart-column', '/admin/reports')],
        [
          item(t('nav.audit'), 'i-lucide-history', '/admin/audit'),
          item(t('nav.loginHistory'), 'i-lucide-log-in', '/admin/login-history'),
        ],
        [
          item(t('nav.settings'), 'i-lucide-settings', '/admin/settings'),
          item(t('nav.profile'), 'i-lucide-user-round', '/profile'),
          item(t('nav.display'), 'i-lucide-monitor', '/display', { target: '_blank' }),
        ],
      ]
    case 'REGISTRAR':
      return [
        [
          item(t('nav.requests'), 'i-lucide-inbox', '/registrar', { exact: true }),
          item(t('nav.newRegistration'), 'i-lucide-clipboard-plus', '/registrar/checkout'),
        ],
        [
          item(t('nav.patients'), 'i-lucide-users', '/registrar/patients'),
          item(t('nav.payments'), 'i-lucide-wallet', '/registrar/payments'),
          item(t('nav.queues'), 'i-lucide-list-ordered', '/registrar/queues'),
        ],
        [
          item(t('nav.profile'), 'i-lucide-user-round', '/profile'),
          item(t('nav.display'), 'i-lucide-monitor', '/display', { target: '_blank' }),
        ],
      ]
    case 'DOCTOR':
      return [
        [item(t('nav.cabinet'), 'i-lucide-stethoscope', '/doctor')],
        [item(t('nav.profile'), 'i-lucide-user-round', '/profile')],
      ]
    default:
      return [[item(t('nav.profile'), 'i-lucide-user-round', '/profile')]]
  }
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
