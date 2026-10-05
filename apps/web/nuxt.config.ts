export default defineNuxtConfig({
  ssr: true,
  modules: ['@pinia/nuxt'],
  runtimeConfig: {
    apiInternalBase: process.env.NUXT_API_INTERNAL_BASE || 'http://api:3001/api/v1',
    public: { apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api/v1' }
  },
  typescript: { strict: true },
  app: { head: { title: 'Clinika — LabMed' } }
})
