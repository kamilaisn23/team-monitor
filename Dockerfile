FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# ── deps: install node_modules only (cached when lockfile unchanged) ──────────
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ── builder: Next.js build + worker bundle ────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ── runner: production app image (Next.js standalone) ────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV SYNC_WORKER_PATH=/app/scripts/sync-worker.js
ENV SYNC_MANAGER_PATH=/app/lib/sync-manager.js
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/scripts-dist/sync-worker.js ./scripts/sync-worker.js
COPY --from=builder /app/scripts-dist/sync-manager.js ./lib/sync-manager.js
COPY --from=builder /app/scripts-dist/sync-cron.js ./scripts/sync-cron.js
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig*.json ./
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --skip-generate && node server.js"]

FROM runner AS sync-runner
CMD ["node", "/app/scripts/sync-cron.js"]

# Default image is the web app; the cron image is selected explicitly by Compose.
FROM runner AS production

