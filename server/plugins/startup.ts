import { prisma } from '../utils/prisma'
import { PERMISSIONS } from '../utils/catalog'
import { hashPassword, passwordFingerprint } from '../utils/auth'
import { SERVICE_CATALOG } from '../utils/service-catalog'

// Idempotent data upgrades that run once per server start.
export default defineNitroPlugin(() => {
  void (async () => {
    try {
      // The separate administrator role was merged into super admin.
      await prisma.user.updateMany({ where: { role: 'ADMIN' }, data: { role: 'SUPER_ADMIN' } })
      await prisma.permission.createMany({ data: PERMISSIONS.map(({ code, label }) => ({ code, label })), skipDuplicates: true })
      for (const { code, label } of PERMISSIONS) {
        await prisma.permission.updateMany({ where: { code, NOT: { label } }, data: { label } })
      }
      // Seed the laboratory catalog only once, so services deleted later are not re-created.
      const seeded = await prisma.setting.findUnique({ where: { key: 'serviceCatalogSeeded' } })
      if (!seeded) {
        await prisma.service.createMany({
          data: SERVICE_CATALOG.map(([department, name]) => ({ department, name, price: 0 })),
          skipDuplicates: true
        })
        await prisma.setting.create({ data: { key: 'serviceCatalogSeeded', value: true } })
      }
      // Demo convenience: explicit opt-in only, and only while no user exists yet.
      const username = String(process.env.BOOTSTRAP_ADMIN_USERNAME || '').trim().toLowerCase()
      const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '')
      if (process.env.AUTO_CREATE_ADMIN === 'true' && username && password && await prisma.user.count() === 0) {
        await prisma.user.create({
          data: { username, passwordHash: await hashPassword(password), passwordFingerprint: passwordFingerprint(password), role: 'SUPER_ADMIN' }
        })
        console.log(`Demo super admin created: ${username}`)
      }
    } catch (error) {
      console.error('startup data upgrade failed', error)
    }
  })()

  // Expired sessions are removed hourly so the table (and its index) stays small.
  const cleanup = () => prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {})
  void cleanup()
  setInterval(cleanup, 60 * 60 * 1000).unref()
})
