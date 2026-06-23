# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN npm ci --workspace=apps/web

COPY apps/web ./apps/web

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

WORKDIR /app/apps/web
RUN npm run build

# ── Production stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app/apps/web
ENV NODE_ENV=production

COPY package.json package-lock.json /app/
COPY apps/api/package.json /app/apps/api/
COPY apps/web/package.json /app/apps/web/
RUN npm ci --workspace=apps/web --omit=dev

COPY --from=builder /app/apps/web/.next  ./.next
COPY --from=builder /app/apps/web/public ./public

EXPOSE 3000
CMD ["npm", "start"]
