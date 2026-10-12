export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const isPublic = to.meta.public === true

  if (!auth.isAuthenticated) {
    if (isPublic) return
    return navigateTo({ path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined })
  }

  if (to.path === '/login' || to.path === '/') return navigateTo(auth.homePath)

  if (auth.mustChangePassword && to.path !== '/change-password' && !isPublic) {
    return navigateTo('/change-password')
  }

  const roles = to.meta.roles
  if (roles && !auth.hasRole(...roles)) return navigateTo(auth.homePath)
})
