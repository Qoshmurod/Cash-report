import { prisma } from '../../../utils/prisma'
import { hashPassword, passwordFingerprint, requireSuperAdmin } from '../../../utils/auth'
import { loadManagedUser } from '../../../utils/staff'

export default defineEventHandler(async (event) => {
  const actor = await requireSuperAdmin(event)
  const target = await loadManagedUser(event, actor)
  const password = String((await readBody(event))?.password || '')
  await prisma.user.update({
    where: { id: target.id },
    data: { passwordHash: await hashPassword(password), passwordFingerprint: passwordFingerprint(password), mustChangePassword: true }
  })
  await prisma.session.deleteMany({ where: { userId: target.id } })
  return { ok: true }
})
