export default defineNuxtConfig({
  ssr: true,
  modules: ['@pinia/nuxt'],
  runtimeConfig: { public: { apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api/v1' } },
  typescript: { strict: true },
  app: { head: { title: 'Clinika — LabMed' } }
})
