# ARCHITECTURE — Team Monitor

> Next.js 16 (App Router) · PostgreSQL 16 · Prisma 5 · NextAuth.js v5 · Tailwind CSS 3

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Deployment Architecture](#deployment-architecture)
3. [Application Layers](#application-layers)
4. [Authentication Flow](#authentication-flow)
5. [Sync Engine](#sync-engine)
6. [Middleware Pipeline](#middleware-pipeline)
7. [Data Flow](#data-flow)
8. [Environment Variables](#environment-variables)
9. [Folder Structure](#folder-structure)

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                      User Browser                        │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌───────────┐  │
│  │Dashboard│  │ Reports  │  │Members │  │Admin Panel│  │
│  └────┬────┘  └────┬─────┘  └───┬────┘  └─────┬─────┘  │
│       │             │            │              │        │
└───────┼─────────────┼────────────┼──────────────┼────────┘
        │             │            │              │
   ┌────▼─────────────▼────────────▼──────────────▼────┐
   │              Next.js Server (Node.js)              │
   │  ┌──────────────────────────────────────────────┐ │
   │  │  App Router (RSC + Client Components)         │ │
   │  └──────────────────────────────────────────────┘ │
   │  ┌──────────────┐  ┌────────────────────────────┐ │
   │  │  Auth Layer   │  │  API Routes (/api/*)       │ │
   │  │  (NextAuth)   │  │  ├─ dashboard, reports     │ │
   │  │  + middleware │  │  ├─ members, teams, repos  │ │
   │  │  + session.ts │  │  ├─ settings, sync         │ │
   │  └──────┬───────┘  │  └─ external (kerjabaik)    │ │
   │         │          └─────────────┬──────────────┘ │
   │         │                        │                 │
   │  ┌──────┴────────────────────────▼──────────────┐  │
   │  │            Prisma Client (ORM)                │  │
   │  └───────────────────────┬──────────────────────┘  │
   └──────────────────────────┼────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   PostgreSQL 16    │
                    │  ┌──────────────┐  │
                    │  │  team_members │  │
                    │  │  teams        │  │
                    │  │  repositories │  │
                    │  │  issues       │  │
                    │  │  settings     │  │
                    │  │  sync_jobs    │  │
                    │  └──────────────┘  │
                    └────────────────────┘

        ┌─────────────────────────────────────┐
        │        Sync Container (Cron)         │
        │  ┌──────────────┐  ┌──────────────┐ │
        │  │  node-cron    │  │  worker.js   │ │
        │  │  (scheduler)  │─▶│  (thread)    │ │
        │  └──────────────┘  └──────┬───────┘ │
        │                           │          │
        │              ┌────────────▼───────┐  │
        │              │  GitHub API        │  │
        │              │  GitLab API        │  │
        │              │  Kerjabaik API     │  │
        │              └────────────────────┘  │
        └─────────────────────────────────────┘
```

---

## Deployment Architecture

### Docker Compose (recommended)

```
┌──────────────────────────────────────────────────┐
│                   docker compose                   │
│                                                    │
│  ┌─────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   db     │  │     app      │  │    sync      │  │
│  │ (pg:16) │  │ (next:20-alp)│  │ (node-cron)  │  │
│  │          │  │              │  │              │  │
│  │ :5432    │  │ :3000 ─────  │  │ ─── thread   │  │
│  │          │  │ PostgREST    │  │ ─── GitHub   │  │
│  └────┬─────┘  └──────┬───────┘  └──────┬───────┘  │
│       │               │                 │          │
│  ┌────▼───────┐ ┌─────▼──────┐  ┌──────▼───────┐  │
│  │ PostgreSQL │ │ Next.js    │  │ Sync Worker  │  │
│  │  Volume    │ │ Standalone │  │ (esbuild)    │  │
│  └────────────┘ └────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────┘
```

- **`db`**: PostgreSQL 16, port 5432, persistent volume
- **`app`**: Next.js standalone build, port 3000
- **`sync`**: `node-cron` scheduler → spawns worker thread every hour

### Dockerfile (multi-stage)

```
base (node:20-alpine)
  └─ deps (pnpm install --prod)
      └─ builder (pnpm install, generate, build, build-worker)
          └─ runner (node server.js)
```

The worker scripts (`sync-worker.ts`, `sync-manager.ts`) are bundled with `esbuild` into `scripts-dist/` before the production image is built.

---

## Application Layers

### 1. Routing Layer (`src/app/`)
```
src/app/
├── layout.tsx              # Root layout (html, body, Providers)
├── page.tsx                # Root redirect dispatcher
├── providers.tsx           # SessionProvider + ThemeProvider
├── (auth)/login/           # GitHub OAuth login page
├── (app)/                  # Authenticated layout (sidebar + header)
│   ├── dashboard/          # Workload overview
│   ├── members/[id]/       # Member profile
│   ├── reports/            # Monthly reports + CSV export
│   └── admin/              # Admin pages (members, teams, repos, settings)
├── pending/                # UNASSIGNED user waiting screen
└── api/                    # All API routes
```

### 2. Authorization Layer
```
middleware.ts
  └─ auth()                    # NextAuth.js middleware
      ├─ Public: /api/auth/*   # Always allowed
      ├─ Unauthenticated       # → /login
      ├─ UNASSIGNED            # → /pending
      ├─ DEVELOPER             # → no /admin/*
      ├─ MANAGER               # → no /admin/*
      ├─ ADMIN                 # → all admin except /admin/settings
      └─ Superadmin            # → everything

src/lib/session.ts             # Server-side helpers
  ├─ getSession()              # Require auth or redirect
  ├─ requireSuperadmin()       # Env-based superadmin only
  ├─ requireAdmin()            # Superadmin or ADMIN role
  ├─ requireManager()          # Manager-level+
  └─ requireRole(...roles)     # Flexible role check
```

### 3. API Layer (`src/app/api/`)

All API routes are Next.js App Router Route Handlers. Conventions:
- JSON responses with `{ error: "..." }` on failure
- Auth checked via `auth()` or `session.ts` helpers
- Authorization checked in both middleware and route handler
- Prisma queries use `mode: 'insensitive'` for text search
- Pagination: `page`/`limit` query params, max 100 per page

### 4. Data Layer (`src/lib/`)
```
prisma.ts          # Prisma client singleton (globalThis for HMR)
auth.ts            # NextAuth config (GitHub provider, JWT/session callbacks)
sync.ts            # Core sync engine (GitHub + GitLab issue fetching)
sync-manager.ts    # Worker-thread-based sync job manager
sync-kerjabaik.ts  # Kerjabaik employee/project sync
github.ts          # GitHub Search API client
gitlab.ts          # GitLab Group Issues API client
kerjabaik.ts       # Kerjabaik external API client
kerjabaik-flag.ts  # Feature flag helpers
service-auth.ts    # Bearer token auth for external APIs
settings.ts        # Workload threshold config (cached)
wib.ts             # WIB (UTC+7) date helpers
utils.ts           # Tailwind class merge (cn)
format-number.ts   # Number formatting (Intl.NumberFormat)
```

### 5. UI Layer (`src/components/`)
```
Layouts/           # Shell components (sidebar, header, theme toggle)
dashboard/         # DashboardClient
members/           # MemberProfileClient, ActivityChart (ApexCharts)
reports/           # ReportsClient
admin/             # Admin CRUD clients + forms
ui/                # Reusable primitives (table, dropdown, pagination, skeleton)
```

### 6. Hooks (`src/hooks/`)
```
use-click-outside.ts  # Click outside detection
use-mobile.ts         # Mobile viewport detection (850px breakpoint)
```

---

## Authentication Flow

```
User clicks "Sign in with GitHub"
      │
      ▼
GET /api/auth/signin/github
      │
      ▼
GitHub OAuth consent screen
      │
      ▼
GET /api/auth/callback/github
      │
      ▼
NextAuth signIn callback:
  ┌─────────────────────────────────────┐
  │ login === SUPERADMIN_GITHUB_USERNAME? │
  │   YES → return true (skip DB)         │
  │   NO  → upsert TeamMember by          │
  │         username_github              │
  │         (new = role UNASSIGNED)       │
  └─────────────────────────────────────┘
      │
      ▼
NextAuth JWT callback:
  ┌─────────────────────────────────────┐
  │ login === SUPERADMIN_GITHUB_USERNAME? │
  │   YES → role=SUPERADMIN,             │
  │         isSuperadmin=true            │
  │   NO  → read TeamMember.role, .id    │
  │         from DB                      │
  └─────────────────────────────────────┘
      │
      ▼
NextAuth session callback:
  session.user = { role, isSuperadmin, id }
      │
      ▼
Set session cookie → redirect to /dashboard
```

---

## Sync Engine

### Trigger Methods

| Method | Entry Point | Trigger |
|--------|------------|---------|
| **Scheduled** | `scripts/sync-cron.ts` | `node-cron` (default `0 19 * * *` = 02:00 WIB) |
| **Manual API** | `POST /api/sync` | Admin clicks "Trigger Sync" in sidebar |
| **Manual CLI** | `npm run sync` | Developer runs locally |

### Execution Architecture

```
POST /api/sync
      │
      ▼
src/lib/sync-manager.ts
  createSyncJob(source)
      │
      ├─ Persist SyncJob to DB (status: "running")
      ├─ Spawn Worker thread (scripts-dist/sync-worker.js)
      │       │
      │       ▼
      │   src/lib/sync.ts → runSync()
      │       │
      │       ├─ For each member (concurrency 2):
      │       │   ├─ fetchGithubIssues(username)
      │       │   │   └─ org:{org} assignee:{username}
      │       │   │   └─ org:{org} author:{username}
      │       │   └─ fetchGitlabIssues(username)
      │       │       └─ group assignee filter + author filter
      │       │
      │       ├─ Upsert repositories
      │       ├─ Upsert issues (by platformId + repositoryId)
      │       ├─ Create IssueAssignee rows
      │       └─ resolveUsernames() → link to TeamMember IDs
      │
      └─ SSE events streamed back via GET /api/sync?jobId=...
```

### Rate Limiting

- **GitHub**: Handles 429 with `Retry-After` header, retries up to 3 times
- **GitLab**: Paginates via `X-Next-Page` header
- **Cooldown**: 5 minutes between syncs enforced by `src/lib/sync-manager.ts`

### Kerjabaik Sync (`src/lib/sync-kerjabaik.ts`)

Separate sync flow that:
1. Fetches employees from Kerjabaik API
2. Upserts TeamMember rows by `kerjabaik_employee_id`
3. Deactivates members not in the response (soft offboard)
4. Syncs project → team mappings with member assignments

---

## Middleware Pipeline

```
Incoming Request
      │
      ▼
src/middleware.ts
      │
      ├─ /api/auth/* ────────────────▶ pass through
      │
      ├─ No session ──────────────────▶ /login (unless already on /login)
      │
      ├─ On /login with session ─────▶ /dashboard
      │
      ├─ role = UNASSIGNED ──────────▶ /pending (unless on /pending)
      │
      ├─ role = DEVELOPER ───────────▶ /admin/* → /dashboard
      │
      ├─ role = MANAGER ─────────────▶ /admin/* → /dashboard
      │
      ├─ role = ADMIN ───────────────▶ /admin/settings → /dashboard
      │
      └─ Otherwise ──────────────────▶ pass through
```

Middleware matcher excludes: `_next/static`, `_next/image`, `favicon.ico`, `fonts`, `images`

---

## Data Flow

### Dashboard Page Load

```
Dashboard page loads
      │
      ▼
DashboardClient (client component)
      │
      ├─ GET /api/teams               → populate team filter dropdown
      ├─ GET /api/repositories?ignored=false → populate repo filter dropdown
      │
      ▼
GET /api/dashboard?page=1&limit=10&sortCol=name&sortDir=asc
      │
      ▼
route.ts:
  1. auth() → get session → check role
  2. Build Prisma where clauses (memberWhere + repoFilter)
  3. Fetch all matching members (no pagination yet)
  4. groupBy IssueAssignee to compute currentLoad per member
  5. getWorkloadThresholds() from settings
  6. Map counts to workloadLevel (low/medium/high)
  7. Sort in memory → paginate → return { total, data }
      │
      ▼
DashboardClient renders:
  • Summary stats cards
  • Filtered, sortable, paginated member table
```

### Reports Page Load

```
Reports page loads
      │
      ▼
ReportsClient (client component)
      │
      ├─ GET /api/repositories?ignored=false → populate repo filter
      │
      ▼
GET /api/reports/monthly?month=2026-07&page=1&limit=10
      │
      ▼
route.ts:
  1. Parse month or start/end range (WIB)
  2. Fetch all non-UNASSIGNED members with optional filters
  3. For each member, compute 4 counts within date range:
     • issuesCreated (by createdAt)
     • issuesAssigned (by issue.createdAt)
     • issuesResolved (by closedAt, state=CLOSED)
     • issuesStillOpen (current, not date-filtered)
  4. If groupBy=team: reorganize into team groups
  5. Sort → paginate → return
      │
      ▼
ReportsClient renders:
  • By Member: sortable table with totals footer
  • By Team: expandable grouped view
  • Export CSV button → GET /api/reports/export?{params}
```

---

## Environment Variables

### Required

| Variable | Purpose |
|----------|---------|
| `AUTH_SECRET` | NextAuth.js encryption secret (must not be placeholder) |
| `NEXTAUTH_URL` | Public URL of the app (e.g. `http://localhost:3000`) |
| `AUTH_GITHUB_ID` | GitHub OAuth app client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth app client secret |
| `SUPERADMIN_GITHUB_USERNAME` | GitHub login that becomes superadmin |
| `GITHUB_ORG_TOKEN` | GitHub PAT with repo/org read access |
| `GITHUB_ORG_NAME` | GitHub organization to scan |
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://...`) |

### Optional

| Variable | Purpose |
|----------|---------|
| `GITLAB_GROUP_TOKEN` | GitLab PAT for group issue access |
| `GITLAB_GROUP_ID` | GitLab group ID to scan |
| `GITLAB_BASE_URL` | Self-hosted GitLab URL (default: `https://gitlab.com`) |
| `KERJABAIK_BASE_URL` | Kerjabaik API base URL |
| `KERJABAIK_SERVICE_TOKEN` | Kerjabaik API auth token |
| `KERJABAIK_SERVICE_TOKENS` | Comma-separated list of valid bearer tokens for inbound API |
| `SYNC_CRON_SCHEDULE` | Cron expression (default: `0 19 * * *`) |
| `SYNC_WORKER_PATH` | Path to compiled worker bundle |
| `SYNC_MANAGER_PATH` | Path to compiled manager bundle |
| `POSTGRES_USER` | DB user (Docker Compose) |
| `POSTGRES_PASSWORD` | DB password (Docker Compose) |

### `.env` Structure
```bash
# Auth
AUTH_SECRET=openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
AUTH_GITHUB_ID=Ov23li...
AUTH_GITHUB_SECRET=abc123...

# Superadmin
SUPERADMIN_GITHUB_USERNAME=your-github-username

# GitHub Sync
GITHUB_ORG_TOKEN=ghp_...
GITHUB_ORG_NAME=YourOrg

# GitLab Sync (optional)
GITLAB_GROUP_TOKEN=glpat-...
GITLAB_GROUP_ID=12345
GITLAB_BASE_URL=https://gitlab.com

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/team_monitor

# Kerjabaik (optional)
KERJABAIK_BASE_URL=https://kerjabaik.example.com
KERJABAIK_SERVICE_TOKEN=kb-token-...
KERJABAIK_SERVICE_TOKENS=kb-token-...

# Worker
SYNC_WORKER_PATH=scripts-dist/sync-worker.js
SYNC_MANAGER_PATH=src/lib/sync-manager.js
```

---

## Folder Structure

```
internal-team-monitor/
├── prisma/
│   └── schema.prisma           # Database schema
├── scripts/
│   ├── sync-cron.ts            # Cron scheduler entry
│   ├── sync-worker.ts          # Worker thread entry
│   ├── build-worker.mjs        # esbuild bundler for worker scripts
│   └── backfill-kerjabaik-id.ts # One-off data backfill
├── scripts-dist/               # Compiled worker bundles (gitignored)
├── src/
│   ├── app/
│   │   ├── (app)/              # Authenticated layout
│   │   │   ├── dashboard/
│   │   │   ├── members/[id]/
│   │   │   ├── reports/
│   │   │   └── admin/
│   │   ├── (auth)/login/
│   │   ├── pending/
│   │   ├── api/                # All API routes
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Root redirect
│   │   └── providers.tsx       # Client providers
│   ├── components/
│   │   ├── Layouts/            # Sidebar, Header, ThemeToggle, UserInfo
│   │   ├── dashboard/
│   │   ├── members/
│   │   ├── reports/
│   │   ├── admin/
│   │   └── ui/                 # Reusable primitives
│   ├── lib/                    # Core business logic
│   ├── types/                  # Shared TypeScript types
│   ├── hooks/                  # Custom React hooks
│   ├── assets/                 # Icons, logos, fonts
│   ├── css/                    # Global styles
│   └── middleware.ts           # Route-level access control
├── docs/                       # Project documentation
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── tsconfig.server.json
└── next.config.mjs
```
