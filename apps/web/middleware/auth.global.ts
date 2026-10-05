export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  if (!auth.loaded) await auth.load()
  if (to.path !== '/login' && !auth.user) return navigateTo('/login')
  if (to.path === '/login' && auth.user) return navigateTo('/')
})
