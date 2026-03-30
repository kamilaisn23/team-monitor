FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl
RUN npm install -g pnpm

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || npm install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN pnpm build || npm run build
# Bundle sync-worker and all its @/ imports into a single self-contained JS file
RUN node scripts/build-worker.mjs

FROM base AS runner
ENV NODE_ENV=production
ENV SYNC_WORKER_PATH=/app/scripts/sync-worker.js
ENV SYNC_MANAGER_PATH=/app/lib/sync-manager.js
RUN apk add --no-cache openssl
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
