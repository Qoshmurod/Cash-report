FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
RUN addgroup -S app && adduser -S app -G app
USER app
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
