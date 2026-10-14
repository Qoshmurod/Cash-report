export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  // Internal app behind login: render on the client only.
  ssr: false,
  css: ['~/assets/main.css'],
  typescript: {
    strict: true,
    typeCheck: true
  },
  runtimeConfig: {
    public: {
      appName: 'Klinika Kassasi'
    }
  }
})
