import { requirePermission } from '../../utils/auth'
import { audit } from '../../utils/audit'
import { readUpdateState, requestUpdate } from '../../utils/update-state'

// Asks the host update agent to install the new version now (it picks this up within a minute).
export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'SYSTEM_UPDATE')
  const state = await readUpdateState()
  if (!state.supported) throw createError({ statusCode: 409, statusMessage: 'Yangilanish agenti o‘rnatilmagan (serverda deploy/install.sh ishga tushirilmagan)' })
  if (!state.available) throw createError({ statusCode: 409, statusMessage: 'Yangi versiya yo‘q' })
  try {
    await requestUpdate(user.username)
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'So‘rovni yozib bo‘lmadi (deploy/state papkasiga ruxsat yo‘q)' })
  }
  await audit(event, user, 'UPDATE_REQUEST', 'system', state.remote, `Tizimni yangilash so‘raldi: ${state.current} → ${state.remote}`)
  return { ok: true }
})
