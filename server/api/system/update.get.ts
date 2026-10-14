import { requirePermission } from '../../utils/auth'
import { readUpdateState } from '../../utils/update-state'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'SYSTEM_UPDATE')
  return { update: await readUpdateState() }
})
