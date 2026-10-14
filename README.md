# Team Monitor

A web application for engineering managers to monitor team activity across GitHub and GitLab. Provides a unified dashboard for tracking open issues, monthly productivity, and workload distribution per team member.

## Features

- **Team Dashboard** — workload overview with open issue counts per member (low / medium / high indicators)
- **Member Profiles** — per-member activity: current load, monthly stats, issue history
- **Monthly Reports** — side-by-side stats table with CSV export
- **Sync Engine** — scheduled background sync from GitHub (personal account or organization) and GitLab (group-wide)
- **Admin Panel** — manage members, teams, and repositories (superadmin only)
- **GitHub SSO** — all users log in via GitHub OAuth
- **Role-based Access** — Superadmin / Manager / Developer roles with appropriate restrictions

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vue 3 Composition API + Vue Router + Vite |
| Backend | Next.js route handlers (API and SPA fallback) |
| Language | TypeScript (strict mode) |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Auth | NextAuth.js v5 (GitHub OAuth) |
| UI | Vue single-file components, custom responsive CSS, Inter, Lucide |
| Charts | Data-driven capacity ring and activity heatmap |
| Background Sync | node-cron (separate Docker container) |
| Deployment | Docker Compose |

---

## Prerequisites

- Node.js 22.12+ (Docker uses Node.js 22)
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

For repositories owned by a personal GitHub account, set `GITHUB_USER_NAME=your-username` and leave `GITHUB_ORG_NAME` empty. Sync searches issues assigned to or authored by registered members inside that account's repositories. Public repositories can be read without a token; for private repositories, set `GITHUB_TOKEN` to a token authorized for those repositories. Existing organization configuration with `GITHUB_ORG_NAME` and `GITHUB_ORG_TOKEN` remains supported. GitHub OAuth is used for signing in; the background sync token is configured separately.

`npm run dev` builds the sync worker and manager and sets their local runtime paths automatically. GitHub-only jobs (`POST /api/sync?source=github`) skip GitLab and Kerjabaik. To monitor the superadmin's own work, also add that username as an active member: the superadmin login itself does not create a member record.

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

The Vue/Vite frontend runs on port 3000 and proxies `/api` to the Next.js backend on port 3001. Open `/preview` to explore all six pages with fictional data without configuring GitHub OAuth. All page logic, forms, filters, and navigation live in `frontend/src`; Next.js no longer renders the application UI.

```bash
npm run typecheck
npm test
```

The dashboard includes a manager summary with scoped issue-age alerts, high-workload members, and the count of issues closed in the last seven days. The alert panel shows the three oldest open issues beyond the configured `staleDays` threshold. “Tinjau isu” opens the full paginated list; live issues link to their source on GitHub or GitLab. Age is measured from creation time and does not indicate the last activity or a confirmed blocker. Summary and detail lists follow the team, member, active status, platform, and repository filters; workload tabs and directory pagination do not change the summary scope. Preview uses fictional completion history and never calls private APIs.

### Dashboard updates

- **Weekly trends:** four adjacent rolling seven-day periods compare issue creation and closure events. The latest period shows its difference from the previous period. Charts follow the team, member name, active status, platform and repository scope, independent of directory pagination and workload tabs. Current assignments determine the member scope; this is not a historical capacity snapshot. Dates are displayed in Asia/Jakarta.
- **Attention center:** use **Buka pusat perhatian** in the manager summary to review old open issues and issues without any source assignee. Unassigned issues follow repository team tags; when searching by member (or filtering inactive members), they follow the issue creator. A source assignee who is not a registered member does not count as unassigned. Reason/status filters and pagination apply before rendering.
- **Follow-up records:** managers, admins and the superadmin can save a review status, an active member as follow-up owner, and a note of up to 2,000 characters. Records are shared through the existing `settings` table under `attention:issue:<id>`, so no database migration is required. Revision checks reject concurrent overwrites. This does not change source issue assignments. Closed or ignored issues disappear from the center; notes remain stored for possible reopening. Due dates and last-activity alerts are not available because those fields are not synchronized yet.
- **Favorite filters:** save up to 12 named dashboard presets (scope, search, platform, repository, member status, workload, sorting and view). Presets persist per GitHub account in the current browser. Applying a preset resets pagination; missing teams or ignored/deleted repositories require resaving the preset. A matching name updates the existing preset.
- **Preview isolation:** `/preview` supports all three features with fictional data. Favorite filters and example follow-ups use separate browser storage keys and never call authenticated APIs or write to the database.

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

This starts three services: `db` (PostgreSQL), `app` (Vue frontend with the API backend), and `sync` (cron job).

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
4. Click **Trigger Sync** in the sidebar (or wait for the configured cron schedule) to pull issues
5. Once sync completes, **Admin → Repositories** will show discovered repos — tag them to teams as needed
6. Share the app URL with your team; members can log in with their GitHub accounts

---

## Project Structure

```
team-monitor/
├── frontend/
│   ├── src/
│   │   ├── App.vue           # Navy sidebar, header and responsive shell
│   │   ├── components/       # Reusable Vue cards, dialogs and controls
│   │   ├── assets/fonts/     # Locally bundled Inter font and license
│   │   ├── pages/            # Dashboard, reports, CRUD, profile and login
│   │   ├── router.ts         # Vue Router and client navigation guards
│   │   ├── state.ts          # Shared workspace and auth state
│   │   └── style.css         # Blue visual system and responsive layouts
│   └── vite.config.ts
├── src/
│   ├── app/
│   │   ├── api/              # Existing API and GitHub OAuth endpoints
│   │   └── [...path]/        # Vue SPA fallback for production deep links
│   ├── lib/                  # Auth, Prisma, synchronization, sample data
│   └── types/                # Shared backend/dashboard contracts
├── public/vue/               # Ignored generated Vue build
├── scripts/                  # Dev orchestration, sync workers, smoke tests
├── prisma/schema.prisma
├── Dockerfile
└── railway.json
```

The frontend is entirely Vue. Next.js and its React runtime remain backend dependencies to preserve Auth.js, API contracts and worker behavior. Public `/preview` never reads private APIs or writes to the database. Real routes retain server-side session/role checks; client navigation guards supplement them.

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

- GitHub/GitLab default schedule: daily at 02:00 WIB (`SYNC_CRON_SCHEDULE=0 19 * * *` with a UTC cron host). The separate cron process/container must be running for scheduled jobs.
- Kerjabaik defaults to hourly; starting the app alone does not run these schedulers.
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
