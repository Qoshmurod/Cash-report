# Full Debian image ships OpenSSL 3, which Prisma needs; no apt-get step required.
FROM node:20-bookworm AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:20-bookworm
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/.output ./.output
EXPOSE 3000
# Apply additive schema changes, then start the server.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node .output/server/index.mjs"]
