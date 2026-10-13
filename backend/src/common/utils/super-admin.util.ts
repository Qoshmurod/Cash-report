/**
 * Super admin accounts (env SUPER_ADMIN_LOGINS, comma separated). Their actions and sign-ins
 * are still written to audit_logs / login_history, but are not shown in the audit log,
 * login history or their exports to anyone except a super admin.
 */
export const superAdminLogins = (): string[] =>
  (process.env.SUPER_ADMIN_LOGINS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const isSuperAdmin = (login: string | null | undefined): boolean => !!login && superAdminLogins().includes(login.toLowerCase());

/** Logins to hide from this viewer (empty → hide nothing). */
export const hiddenLoginsFor = (viewerLogin: string | null | undefined): string[] => (isSuperAdmin(viewerLogin) ? [] : superAdminLogins());
