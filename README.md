# Klinika Kassasi

Nuxt 3 clinic cashier and patient-management app backed by Prisma and PostgreSQL (Supabase).

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and replace both Supabase connection-string placeholders.
3. Install dependencies with `npm install` (this runs `prisma generate`).
4. Apply the schema with `npm run prisma:push`.
5. Seed the departments and starter services with `npm run prisma:seed`.
6. Start the UI with `npm run dev`.

Starter service prices are zero by design; an authorized administrator must configure
real prices before taking payments. The server API uses Prisma for patient and payment
CRUD, database-backed departments/services, search, import preview/confirmation,
filtering, soft-deactivation, statistics, and permission-protected Excel reports.
Authentication uses database-backed sessions, scrypt password hashing, an opaque
HttpOnly cookie, login throttling, server-side permissions, login history, and audit
logs. Passwords are never stored in plain text.

Super admins can import patient data from the **Bemorlar** page using `.xlsx`, `.xls`, `.csv`, or `.txt` files. The first worksheet is read automatically; columns containing `ism`, `familiya`, `name`, `telefon`, `phone`, `tugilgan yili`, `year`, `manzil`, or `address` are recognized. Rows without a name and duplicate name/phone pairs are skipped, and the import response reports added and skipped rows. The upload is server-side validated and is available only to `SUPER_ADMIN`.

The interface includes a language selector for Uzbek, English, and Russian. Patient duplicate detection uses the complete identity tuple: normalized full name, phone number, and birth year. Passwords may be reused by different users; they remain scrypt-hashed, and changing credentials always requires the current password.

Clinic workflow modules include database-driven departments and services, direct
reception-to-payment flow, payment methods (`CASH`, `CARD`, `TRANSFER`), cashier
identity on each transaction, and a super-admin permission matrix. The `/reception`
page no longer exposes queue controls; it selects patient, department, and filtered
service before saving payment. Import preview is available with
`POST /api/patients/import?action=preview`, confirmation with
`POST /api/patients/import?action=confirm`, and the template is downloadable from
`GET /api/patients/import-template`.

There is no hardcoded or displayed default super-admin credential. After `prisma:push`, set unique random `NUXT_SESSION_SECRET`, `BOOTSTRAP_ADMIN_TOKEN`, `BOOTSTRAP_ADMIN_USERNAME`, and `BOOTSTRAP_ADMIN_PASSWORD` values, then call `POST /api/auth/bootstrap` once with `x-bootstrap-token` and the chosen credentials to create the only `SUPER_ADMIN`; the endpoint is permanently closed once any user exists. Admin password resets are performed only by the super admin and force a change on next login. The `PATIENTS_NAME_EDIT` permission should be granted only to cashier/operator accounts (super admin always bypasses permission checks). Export reports with `GET /api/reports/payments?from=YYYY-MM-DD&to=YYYY-MM-DD` (ADMIN or SUPER_ADMIN).

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