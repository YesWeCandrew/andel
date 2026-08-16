FROM node:24-alpine AS frontend-build
WORKDIR /app
COPY shared ./shared
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm ci
RUN npm run build

FROM node:24-alpine AS backend-deps
RUN apk add --no-cache python3 make g++
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-alpine
WORKDIR /app

COPY shared ./shared
COPY backend/package.json ./backend/package.json
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY backend/src ./backend/src
COPY backend/drizzle ./backend/drizzle
COPY backend/drizzle.config.ts ./backend/drizzle.config.ts
COPY --from=frontend-build /app/frontend/dist ./backend/public

WORKDIR /app/backend
ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "node src/migrate.ts && node src/server.ts"]
