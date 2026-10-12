// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',

  /**
   * SPA mode (no SSR).
   * The whole UI sits behind JWT authentication whose tokens live in the browser
   * (localStorage), pages are never indexed by search engines, and kiosk / TV
   * screens run as long-lived single page apps with a WebSocket connection.
   * Server rendering would add complexity (token forwarding, hydration of
   * realtime state) without any benefit for this internal hospital system.
   */
  ssr: false,

  devtools: { enabled: false },

  modules: ['@nuxt/ui', '@pinia/nuxt', '@vueuse/nuxt', '@nuxtjs/i18n'],

  css: ['~/assets/css/main.css'],

  // Components are organised in feature folders but used without path prefixes (<StatusBadge>, <DataTable> …)
  components: [{ path: '~/components', pathPrefix: false }],

  app: {
    head: {
      title: 'Shifoxona',
      htmlAttrs: { lang: 'uz' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#0d9488' },
        { name: 'description', content: 'Hospital / medical center management system' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  runtimeConfig: {
    public: {
      // Overridable at runtime with NUXT_PUBLIC_API_BASE / NUXT_PUBLIC_WS_URL / NUXT_PUBLIC_DEFAULT_LOCALE
      apiBase: 'http://localhost:4000/api/v1',
      wsUrl: 'http://localhost:4000',
      defaultLocale: 'uz',
    },
  },

  colorMode: {
    preference: 'system',
    fallback: 'light',
    storageKey: 'shifoxona-color-mode',
  },

  ui: {
    theme: {
      colors: ['primary', 'secondary', 'success', 'info', 'warning', 'error', 'neutral'],
    },
  },

  fonts: {
    families: [{ name: 'Inter', provider: 'google', weights: [400, 500, 600, 700, 800] }],
  },

  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'uz',
    locales: [
      { code: 'uz', language: 'uz-UZ', name: "O'zbekcha", file: 'uz.json' },
      { code: 'ru', language: 'ru-RU', name: 'Русский', file: 'ru.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'shifoxona_locale',
      redirectOn: 'root',
      fallbackLocale: 'uz',
    },
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  vite: {
    optimizeDeps: {
      include: ['echarts/core', 'echarts/charts', 'echarts/components', 'echarts/renderers', 'vue-echarts', 'socket.io-client'],
    },
  },
})
