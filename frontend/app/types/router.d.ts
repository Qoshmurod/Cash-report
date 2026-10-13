import type { Role } from './api'
import type { SectionKey } from '../utils/sections'

declare module '#app' {
  interface PageMeta {
    /** Roles allowed to open the page. Undefined = any authenticated user. */
    roles?: Role[]
    /** Bo'limlar: page opens if the user has ANY of them (super admin: always). */
    sections?: SectionKey[]
    /** Page reachable without authentication. */
    public?: boolean
    /** i18n key for the page title (document title + navbar). */
    titleKey?: string
  }
}

export {}
