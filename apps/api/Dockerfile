# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN npm ci --workspace=apps/api

COPY apps/api ./apps/api

WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# ── Production stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN npm ci --workspace=apps/api --omit=dev

COPY --from=builder /app/apps/api/dist    ./apps/api/dist
COPY --from=builder /app/apps/api/prisma  ./apps/api/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001
WORKDIR /app/apps/api
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
