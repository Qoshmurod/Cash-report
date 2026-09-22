import { getAuthUser } from '../utils/auth'

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) return
  if (
    event.path === '/api/auth/login' ||
    event.path === '/api/auth/logout' ||
    event.path === '/api/auth/bootstrap'
  ) return
  const user = await getAuthUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Autentifikatsiya talab qilinadi' })
  event.context.user = user
})
