import type { Role } from '~/types/api'

export const STORAGE_KEYS = {
  accessToken: 'shifoxona.accessToken',
  refreshToken: 'shifoxona.refreshToken',
  user: 'shifoxona.user',
  sidebarCollapsed: 'shifoxona.sidebarCollapsed',
  displaySound: 'shifoxona.displaySound',
} as const

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: '/admin',
  REGISTRAR: '/registrar',
  DOCTOR: '/doctor',
  KIOSK: '/kiosk',
}

export const DEFAULT_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
export const SEARCH_DEBOUNCE_MS = 350
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const MAX_IMAGE_DIMENSION = 800
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const KIOSK_IDLE_MS = 60_000
export const KIOSK_SUCCESS_RESET_MS = 15_000
export const BOARD_POLL_MS = 15_000
export const DOCTOR_POLL_MS = 30_000
export const MAX_CHECKOUT_ITEMS = 20
export const ALL_FILTER = '__all__'
