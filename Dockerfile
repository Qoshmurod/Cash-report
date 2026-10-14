# ---- build: compile the Nuxt app (heap capped so it also builds on 2 GB RAM + swap)
FROM node:20-alpine AS build
WORKDIR /app
ENV NODE_OPTIONS=--max-old-space-size=1536 NUXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---- runtime deps: Prisma CLI (schema sync at start) and the lazily loaded file parsers
FROM node:20-alpine AS migrate
WORKDIR /m
RUN npm init -y >/dev/null && npm install --no-audit --no-fund prisma@6.19.3 xlsx@0.18.5 mammoth@1.13.0

# ---- runtime: self-contained Nitro output, no dev dependencies
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 NUXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS="--max-old-space-size=192"
COPY --from=migrate /m/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/.output ./.output
USER node
EXPOSE 3000
CMD ["sh", "-c", "node node_modules/prisma/build/index.js db push --skip-generate && exec node .output/server/index.mjs"]
