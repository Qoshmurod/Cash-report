import type { User } from '~/types/api'

/**
 * Client bootstrap:
 *  - applies the runtime-configured default locale on first visit (no cookie yet)
 *  - loads public hospital settings (name, currency, timezone)
 *  - refreshes the stored user profile so role/status changes made by an admin apply immediately
 */
export default defineNuxtPlugin({
  name: 'app-init',
  dependsOn: ['pinia'],
  async setup(nuxtApp) {
    const config = useRuntimeConfig()
    const i18n = nuxtApp.$i18n
    const hasLocaleCookie = document.cookie.split('; ').some((c) => c.startsWith('shifoxona_locale='))
    const preferred = config.public.defaultLocale
    if (!hasLocaleCookie && (preferred === 'uz' || preferred === 'ru') && i18n.locale.value !== preferred) {
      await i18n.setLocale(preferred)
    }

    const settings = useSettingsStore()
    const auth = useAuthStore()

    nuxtApp.hook('app:mounted', () => {
      void settings.loadPublic()
      if (auth.accessToken) {
        const api = useApi()
        api
          .get<User>('/auth/me')
          .then((user) => auth.setUser(user))
          .catch(() => {
            // 401 is handled inside useApi (session cleared + redirect)
          })
      }
    })
  },
})
