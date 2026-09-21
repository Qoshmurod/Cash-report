# Klinika Kassasi

Nuxt 3 clinic cashier and patient-management app backed by Prisma and PostgreSQL (Supabase).

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and replace both Supabase connection-string placeholders.
3. Install dependencies with `npm install` (this runs `prisma generate`).
4. Apply the schema with `npm run prisma:push`.
5. Start the UI with `npm run dev`.

The server API uses Prisma for patient and payment CRUD, search, import, filtering, deletion, and statistics. The current authentication endpoint remains a demo `SUPER_ADMIN` identity; replace it with the intended session provider before production use.

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