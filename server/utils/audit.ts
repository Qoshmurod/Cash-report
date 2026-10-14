import type { H3Event } from 'h3'
import { prisma } from './prisma'
import type { AuthUser } from './auth'

function clientIp(event: H3Event) {
  return getRequestIP(event, { xForwardedFor: true }) || null
}

// Super admin actions are deliberately never stored.
export async function audit(event: H3Event, user: AuthUser, action: string, entity: string, entityId: string | number | null, summary: string, details?: unknown) {
  if (user.isSuperAdmin) return
  try {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        username: user.username,
        action,
        entity,
        entityId: entityId === null ? null : String(entityId),
        summary,
        details: details === undefined ? undefined : JSON.parse(JSON.stringify(details)),
        ip: clientIp(event)
      }
    })
  } catch (error) {
    console.error('audit log failed', error)
  }
}

export async function recordLogin(event: H3Event, user: { id: number | null; username: string; isSuperAdmin: boolean }, type: 'LOGIN' | 'LOGOUT' | 'FAILED') {
  if (user.isSuperAdmin) return
  try {
    await prisma.loginEvent.create({
      data: {
        userId: user.id,
        username: user.username,
        type,
        ip: clientIp(event),
        userAgent: (getHeader(event, 'user-agent') || '').slice(0, 300) || null
      }
    })
  } catch (error) {
    console.error('login history failed', error)
  }
}
