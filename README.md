# Klinika Kassasi

Nuxt 3 starter for the clinic cashier and patient-management screens supplied in the source attachments.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and set real values locally.
3. Install dependencies with `npm install`.
4. Start the UI with `npm run dev`.

The reconstructed API uses an in-memory store so the supplied screens can be previewed immediately. Data is reset when the dev server restarts; connect the handlers in `server/api` to the intended Prisma schema before using this for production.

## Deploy to Vercel

1. Push this branch to GitHub and import the repository in Vercel.
2. Keep the detected framework as **Nuxt.js**. The checked-in `vercel.json` uses `npm install` and `npm run build`.
3. Deploy without committing `.env`; add environment variables in Vercel's project settings instead.

The current demo does not require environment variables because its API store is in memory. `.env.example` documents the intended future values: `DATABASE_URL` for the Prisma database and `NUXT_SESSION_SECRET` for session signing. Configure both in Vercel only after the persistent Prisma/auth implementation is added; deploying the current demo will lose all data whenever its server instance is replaced or restarted.

Validation commands:

```sh
npm run typecheck
npm run build
```