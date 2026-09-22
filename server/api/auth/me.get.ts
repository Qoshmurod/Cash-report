import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => ({ user: await requireAuth(event) }))
