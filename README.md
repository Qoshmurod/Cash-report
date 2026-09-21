# Klinika Kassasi

Nuxt 3 starter for the clinic cashier and patient-management screens supplied in the source attachments.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and set real values locally.
3. Install dependencies with `npm install`.
4. Start the UI with `npm run dev`.

The reconstructed API uses an in-memory store so the supplied screens can be previewed immediately. Data is reset when the dev server restarts; connect the handlers in `server/api` to the intended Prisma schema before using this for production.

Validation commands:

```sh
npm run typecheck
npm run build
```