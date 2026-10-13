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

  const sections = to.meta.sections
  if (sections?.length) {
    if (!auth.can(...sections)) return navigateTo(auth.homePath)
    return
  }
  const roles = to.meta.roles
  if (roles && !auth.hasRole(...roles) && !auth.isSuperAdmin) return navigateTo(auth.homePath)
})
