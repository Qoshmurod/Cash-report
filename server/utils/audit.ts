import type { H3Event } from 'h3'
import { getRequestIP } from 'h3'
import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import type { AuthUser } from './auth'

export async function recordAudit(
  event: H3Event,
  user: AuthUser | null,
  input: {
    action: string
    entity: string
    entityId?: number | string | null
    details?: Prisma.InputJsonObject
  }
) {
  await prisma.auditLog.create({
    data: {
      userId: user?.id ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId == null ? null : String(input.entityId),
      details: input.details,
      ipAddress: getRequestIP(event, { xForwardedFor: true }) || null
    }
  })
}
