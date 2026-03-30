# Team Monitor

A web application for engineering managers to monitor team activity across GitHub and GitLab. Provides a unified dashboard for tracking open issues, monthly productivity, and workload distribution per team member.

## Features

- **Team Dashboard** — workload overview with open issue counts per member (low / medium / high indicators)
- **Member Profiles** — per-member activity: current load, monthly stats, issue history
- **Monthly Reports** — side-by-side stats table with CSV export
- **Sync Engine** — hourly background sync from GitHub (org-wide) and GitLab (group-wide)
- **Admin Panel** — manage members, teams, and repositories (superadmin only)
- **GitHub SSO** — all users log in via GitHub OAuth
- **Role-based Access** — Superadmin / Manager / Developer roles with appropriate restrictions

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Auth | NextAuth.js v5 (GitHub OAuth) |
| UI | NextAdmin template + Tailwind CSS |
| Charts | ApexCharts |
| Background Sync | node-cron (separate Docker container) |
| Deployment | Docker Compose |

---

## Prerequisites

- Node.js 20+
- PostgreSQL 16 (or Docker)
- A GitHub OAuth App (for login SSO)
- A GitHub org-level token (for issue sync)
- A GitLab group-level token (for issue sync, if applicable)

---

## Setup

### 1. Clone and install dependencies

```bash
cd team-monitor
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in all values:

```env
# App
AUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

# GitHub OAuth App — for login SSO
# Create at: https://github.com/settings/developers → OAuth Apps
# Callback URL: http://localhost:3000/api/auth/callback/github
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-client-secret

# Superadmin — GitHub username of the admin account
SUPERADMIN_GITHUB_USERNAME=your-github-username

# GitHub org token — for issue sync (needs read:org and repo scopes)
# Create at: https://github.com/settings/tokens
GITHUB_ORG_TOKEN=ghp_...
GITHUB_ORG_NAME=your-org-name

# GitLab group token — for issue sync (needs read_api scope)
# Create at: https://gitlab.yourcompany.com/-/profile/personal_access_tokens
GITLAB_GROUP_TOKEN=glpat-...
GITLAB_GROUP_ID=12345
GITLAB_BASE_URL=https://gitlab.yourcompany.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/team_monitor
POSTGRES_USER=user
POSTGRES_PASSWORD=password
```

### 3. Set up the database

**Option A — Local PostgreSQL:**
```bash
createdb team_monitor
npx prisma migrate dev --name init
```

**Option B — Docker PostgreSQL only:**
```bash
docker compose up db -d
# Wait for it to be healthy, then:
npx prisma migrate dev --name init
```

### 4. Generate Prisma client

```bash
npx prisma generate
```

---

## Running Locally

### Development mode (app only)

```bash
npm run dev
```

App will be available at [http://localhost:3000](http://localhost:3000).

### Run the sync job manually (development)

```bash
npx ts-node --project tsconfig.server.json scripts/sync-cron.ts
```

### Production build

```bash
npm run build
npm start
```

---

## Running with Docker Compose (recommended for production)

This starts three services: `db` (PostgreSQL), `app` (Next.js), and `sync` (cron job).

```bash
# Build and start all services
docker compose up --build

# Or run in background
docker compose up --build -d
```

Then run the database migration (first time only):

```bash
docker compose exec app npx prisma migrate deploy
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Stopping

```bash
docker compose down
```

### Stopping and removing volumes (wipes the database)

```bash
docker compose down -v
```

---

## First-Time Usage

1. Open the app and sign in with the **superadmin** GitHub account (`SUPERADMIN_GITHUB_USERNAME`)
2. Go to **Admin → Members** and add team members with their GitHub/GitLab usernames
3. Go to **Admin → Teams** and create teams, then assign members
4. Click **Trigger Sync** in the sidebar (or wait for the hourly cron) to pull issues
5. Once sync completes, **Admin → Repositories** will show discovered repos — tag them to teams as needed
6. Share the app URL with your team; members can log in with their GitHub accounts

---

## Project Structure

```
team-monitor/
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # GitHub SSO login page
│   │   ├── pending/               # Unassigned role waiting screen
│   │   ├── (app)/                 # Authenticated layout (sidebar + header)
│   │   │   ├── dashboard/         # Team workload overview
│   │   │   ├── members/[id]/      # Member profile page
│   │   │   ├── reports/           # Monthly report + CSV export
│   │   │   └── admin/             # Admin pages (superadmin only)
│   │   │       ├── members/       # Member management + username mapping
│   │   │       ├── teams/         # Team management
│   │   │       └── repositories/  # Repo tagging + ignore config
│   │   └── api/                   # API routes
│   ├── components/                # UI components
│   ├── lib/
│   │   ├── auth.ts                # NextAuth.js config
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── session.ts             # Session helpers + role guards
│   │   ├── github.ts              # GitHub API client
│   │   ├── gitlab.ts              # GitLab API client
│   │   └── sync.ts                # Core sync logic
│   └── types/                     # Shared TypeScript types
├── scripts/
│   └── sync-cron.ts               # node-cron entrypoint
├── prisma/
│   └── schema.prisma              # Database schema
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## Roles

| Role | Access |
|---|---|
| **Superadmin** | Full access — hardcoded via `SUPERADMIN_GITHUB_USERNAME` env var, not stored in DB |
| **Manager** | Dashboard, reports, member profiles |
| **Developer** | Own profile only |
| **Unassigned** | Pending screen only — superadmin must assign a role |

---

## Sync Details

- Runs every hour at `:00` via node-cron
- Also runs once on sync container startup
- Manual trigger: **Trigger Sync** button in sidebar (superadmin only) or `POST /api/sync`
- GitHub: uses Search API (`org:{org} assignee:{username}` + `author:{username}`) with 2s delay between calls to respect the 30 req/min rate limit
- GitLab: uses group issues API (`/api/v4/groups/{id}/issues`) with 500ms delay between calls
- Repositories are auto-discovered during sync — no manual registration needed
- Estimated sync time: ~3 minutes for 35 members

---

## Environment Variable Reference

| Variable | Required | Description |
|---|---|---|
| `AUTH_SECRET` | Yes | Random secret for NextAuth.js session encryption |
| `NEXTAUTH_URL` | Yes | Full URL of the app (e.g. `http://localhost:3000`) |
| `AUTH_GITHUB_ID` | Yes | GitHub OAuth App client ID |
| `AUTH_GITHUB_SECRET` | Yes | GitHub OAuth App client secret |
| `SUPERADMIN_GITHUB_USERNAME` | Yes | GitHub login of the superadmin account |
| `GITHUB_ORG_TOKEN` | Yes | GitHub PAT with `read:org` + `repo` scopes |
| `GITHUB_ORG_NAME` | Yes | GitHub organization name (e.g. `my-company`) |
| `GITLAB_GROUP_TOKEN` | No | GitLab PAT with `read_api` scope |
| `GITLAB_GROUP_ID` | No | Numeric GitLab group ID |
| `GITLAB_BASE_URL` | No | Self-hosted GitLab URL (e.g. `https://gitlab.company.com`) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `POSTGRES_USER` | Yes (Docker) | Postgres username (used by Docker Compose) |
| `POSTGRES_PASSWORD` | Yes (Docker) | Postgres password (used by Docker Compose) |
