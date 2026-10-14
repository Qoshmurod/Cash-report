import { destroySession, getAuthUser } from '../../utils/auth'
import { recordLogin } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (user) await recordLogin(event, user, 'LOGOUT')
  await destroySession(event)
  return { ok: true }
})
