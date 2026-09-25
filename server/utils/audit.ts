import type { H3Event } from 'h3'
import { getRequestIP } from 'h3'
import type { AuthUser } from './auth'
import { prisma } from './prisma'

export async function recordAudit(
  event: H3Event,
  user: AuthUser | null,
  input: {
    action: string
    entity: string
    entityId?: number | string | null
    details?: Record<string, unknown>
  }
) {
  await prisma.auditLog.create({
    data: {
      userId: user?.id ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId == null ? null : String(input.entityId),
      next: input.details ? JSON.stringify(input.details) : null,
      ipAddress: getRequestIP(event, { xForwardedFor: true }) || null
    }
  })
}
