export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const { user, loaded, refresh, navItems } = useAuth()
  if (!loaded.value) await refresh()
  if (to.path === '/') {
    if (user.value && navItems.value[0]) return navigateTo(navItems.value[0].to)
    return
  }
  if (!user.value) return navigateTo('/')
})
