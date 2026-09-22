# Klinika Kassasi

Nuxt 3 clinic cashier and patient-management app backed by Prisma and PostgreSQL (Supabase).

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and replace both Supabase connection-string placeholders.
3. Install dependencies with `npm install` (this runs `prisma generate`).
4. Apply the schema with `npm run prisma:push`.
5. Start the UI with `npm run dev`.

The server API uses Prisma for patient and payment CRUD, search, import, filtering, deletion, statistics, and permission-protected Excel reports. Authentication uses database-backed sessions, scrypt password hashing, an opaque HttpOnly cookie, login throttling, and server-side role checks. Passwords are never stored in plain text; a keyed fingerprint is used only to reject duplicate passwords without making them recoverable.

The default ready-made first super admin is `Husanov001` / `Husanov001`. You can override it in `.env` with `BOOTSTRAP_ADMIN_USERNAME` and `BOOTSTRAP_ADMIN_PASSWORD`, but the UI also pre-fills the same values for the login screen. After `prisma:push`, set unique random `NUXT_SESSION_SECRET` and `BOOTSTRAP_ADMIN_TOKEN` values, then call `POST /api/auth/bootstrap` once with `x-bootstrap-token` and the chosen credentials to create the only `SUPER_ADMIN`; the endpoint is permanently closed once any user exists. Admin password resets are performed only by the super admin and force a change on next login. Export reports with `GET /api/reports/payments?from=YYYY-MM-DD&to=YYYY-MM-DD` (ADMIN or SUPER_ADMIN).

## Deploy to Vercel

1. Push this branch to GitHub and import the repository in Vercel.
2. Keep the detected framework as **Nuxt.js**. The checked-in `vercel.json` uses `npm install` and `npm run build`.
3. Deploy without committing `.env`; add `DATABASE_URL`, `DIRECT_URL`, and `NUXT_SESSION_SECRET` in Vercel's project settings.
4. Run `npm run prisma:push` locally against the Supabase database before using the deployed app (or apply the equivalent reviewed migration).

`DATABASE_URL` should use Supabase's pooled connection string on port `6543` with `?pgbouncer=true`; `DIRECT_URL` should use the direct database connection on port `5432` for Prisma schema operations. Never put either credential in source control.

Validation commands:

```sh
npm run typecheck
npm run build
```