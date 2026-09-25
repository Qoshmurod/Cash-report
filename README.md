# Klinika Kassasi

Nuxt 3 clinic cashier and patient-management app backed by Prisma and PostgreSQL (Supabase).

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and replace both Supabase connection-string placeholders.
3. Install dependencies with `npm install` (this runs `prisma generate`).
4. Apply the schema with `npm run prisma:push`.
5. Start the UI with `npm run dev`.

The server API uses Prisma for patient and payment CRUD, search, import, filtering, deletion, statistics, and permission-protected Excel reports. Authentication uses database-backed sessions, scrypt password hashing, an opaque HttpOnly cookie, login throttling, and server-side role checks. Passwords are never stored in plain text; a keyed fingerprint is used only to reject duplicate passwords without making them recoverable.

Super admins can import patient data from the **Bemorlar** page using `.xlsx`, `.xls`, `.csv`, or `.txt` files. The first worksheet is read automatically; columns containing `ism`, `familiya`, `name`, `telefon`, `phone`, `tugilgan yili`, `year`, `manzil`, or `address` are recognized. Rows without a name and duplicate name/phone pairs are skipped, and the import response reports added and skipped rows. The upload is server-side validated and is available only to `SUPER_ADMIN`.

The interface includes a language selector for Uzbek, English, and Russian. Patient duplicate detection uses the complete identity tuple: normalized full name, phone number, and birth year. Passwords may be reused by different users; they remain scrypt-hashed, and changing credentials always requires the current password.

Clinic workflow modules now include reception/queue statuses (`WAITING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), doctors, database-backed departments and services, appointment history, payment methods (`CASH`, `CARD`, `TRANSFER`), and a super-admin permission matrix. The `/reception` page manages the queue, while `/admin` lets the super admin assign permissions in a Telegram-style matrix and review the audit journal. The cashier can select one or more seeded laboratory analyses during payment; each payment keeps those selections in the database. Department workstations can open `/department/BAKTERIOLOGIYA`, `/department/PARAZITOLOGIYA`, `/department/VIRUSOLOGIYA`, or `/department/SAN_MINIMUM` to see only patients routed to that department and their analyses. Payment creation/deletion, patient imports, user administration, password changes, and permission changes are recorded in `AuditLog`. Apply the additive schema with `npx prisma db push` before first use of these modules.

There is no hardcoded or displayed default super-admin credential. After `prisma:push`, set unique random `NUXT_SESSION_SECRET`, `BOOTSTRAP_ADMIN_TOKEN`, `BOOTSTRAP_ADMIN_USERNAME`, and `BOOTSTRAP_ADMIN_PASSWORD` values, and do not leave the bootstrap credentials blank. Call `POST /api/auth/bootstrap` once with `x-bootstrap-token` and the chosen credentials to create the only `SUPER_ADMIN`; the endpoint is permanently closed once any user exists. Admin password resets are performed only by the super admin and force a change on next login. The `PATIENTS_NAME_EDIT` permission should be granted only to cashier/operator accounts (super admin always bypasses permission checks). Export reports with `GET /api/reports/payments?from=YYYY-MM-DD&to=YYYY-MM-DD` (ADMIN or SUPER_ADMIN).

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