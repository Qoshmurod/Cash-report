# syntax=docker/dockerfile:1

# ── 1. Dependencies (cached layer; lifecycle scripts run later with sources present) ──
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund

# ── 2. Build ──
FROM node:22-alpine AS build
WORKDIR /app
ENV NUXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm rebuild esbuild && npx nuxi prepare && npm run build

# ── 3. Runtime: only the self-contained Nitro output ──
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NUXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/.output ./.output
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", ".output/server/index.mjs"]
