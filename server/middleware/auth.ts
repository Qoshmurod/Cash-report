import { getAuthUser } from '../utils/auth'

const PUBLIC_ROUTES = new Set(['/api/auth/login', '/api/auth/logout', '/api/auth/bootstrap', '/api/settings/contact'])

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) return
  const path = event.path.split('?')[0]!
  if (PUBLIC_ROUTES.has(path) && !(path === '/api/settings/contact' && event.method !== 'GET')) return
  const user = await getAuthUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Autentifikatsiya talab qilinadi' })
  event.context.user = user
})
