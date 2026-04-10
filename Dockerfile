FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl
RUN npm install -g pnpm

# ── deps: install node_modules only (cached when lockfile unchanged) ──────────
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm install

# ── builder: Next.js build + worker bundle ────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN --mount=type=cache,id=nextjs-cache,target=/app/.next/cache \
    npm run build
RUN node scripts/build-worker.mjs

# ── runner: production app image (Next.js standalone) ────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV SYNC_WORKER_PATH=/app/scripts/sync-worker.js
ENV SYNC_MANAGER_PATH=/app/lib/sync-manager.js
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/scripts-dist/sync-worker.js ./scripts/sync-worker.js
COPY --from=builder /app/scripts-dist/sync-manager.js ./lib/sync-manager.js
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig*.json ./
EXPOSE 3000

# ── sync-runner: lightweight image for the cron worker (no Next.js build) ────
FROM base AS sync-runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
