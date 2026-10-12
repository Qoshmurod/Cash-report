import type { Role } from './api'

declare module '#app' {
  interface PageMeta {
    /** Roles allowed to open the page. Undefined = any authenticated user. */
    roles?: Role[]
    /** Page reachable without authentication. */
    public?: boolean
    /** i18n key for the page title (document title + navbar). */
    titleKey?: string
  }
}

export {}
