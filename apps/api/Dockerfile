FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src/config.ts ./src/config.ts
COPY package*.json ./
RUN addgroup -S app && adduser -S app -G app
USER app
CMD ["sh", "-c", "node -e \"require('./dist/src/config').validateEnvironment()\" && npx prisma db push && npx tsx prisma/seed.ts && node dist/src/main.js"]
