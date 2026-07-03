# MODULES & FEATURES — Team Monitor

> Feature-to-page-to-component mapping with API endpoint references.

---

## Table of Contents

1. [Routing Structure](#routing-structure)
2. [Feature Map](#feature-map)
3. [Component Tree](#component-tree)
4. [API → Component Mapping](#api--component-mapping)

---

## Routing Structure

```
/                           → Redirect to /dashboard, /pending, or /login
/login                      → GitHub OAuth sign-in page
/pending                    → Waiting screen for UNASSIGNED users

/(app)/                     ← Authenticated layout (sidebar + header)
  /dashboard                → Workload overview
  /members/[id]             → Member profile page
  /reports                  → Monthly reports + CSV export
  /admin/members            → Manage members (CRUD)
  /admin/members/new        → Create member form
  /admin/members/[id]/edit  → Edit member form
  /admin/teams              → Manage teams + team memberships
  /admin/repositories       → Manage repositories (ignore/unignore)
  /admin/settings           → Workload thresholds (superadmin only)
```

### Route Guards

| Route | UNASSIGNED | DEVELOPER | MANAGER | ADMIN | SUPERADMIN |
|-------|:---:|:---:|:---:|:---:|:---:|
| `/login` | Yes | Redirect | Redirect | Redirect | Redirect |
| `/pending` | Yes | — | — | — | — |
| `/dashboard` | — | Yes | Yes | Yes | Yes |
| `/members/[id]` | — | Own only | Yes | Yes | Yes |
| `/reports` | — | Yes | Yes | Yes | Yes |
| `/admin/members` | — | — | — | Yes | Yes |
| `/admin/teams` | — | — | — | Yes | Yes |
| `/admin/repositories` | — | — | — | Yes | Yes |
| `/admin/settings` | — | — | — | — | Yes |

---

## Feature Map

### 1. Authentication

| Feature | Page | Components | API |
|---------|------|------------|-----|
| GitHub OAuth login | `/login` | `SignIn` (server page) | `api/auth/[...nextauth]` |
| Session management | All | `Providers` (SessionProvider) | Internal (NextAuth) |
| Sign out | Header | `UserInfo` dropdown | `signOut()` |
| Role-based redirect | `/` (root) | Server page logic | Internal |

### 2. Dashboard

| Feature | Page | Components | API |
|---------|------|------------|-----|
| Member workload table | `/dashboard` | `DashboardClient` | `GET /api/dashboard` |
| Summary stats (Members, Open Issues, High Workload) | `/dashboard` | `DashboardClient` | `GET /api/dashboard` |
| Team filter dropdown | `/dashboard` | `DashboardClient` | `GET /api/teams` |
| Repository filter dropdown | `/dashboard` | `DashboardClient` | `GET /api/repositories?ignored=false` |
| Platform filter | `/dashboard` | `DashboardClient` | Query param |
| Active/Inactive filter | `/dashboard` | `DashboardClient` | Query param |
| Name search | `/dashboard` | `DashboardClient` | Query param |
| Sorting (Name, Role, Load, Workload) | `/dashboard` | `DashboardClient` | Query params |
| Pagination | `/dashboard` | `Pagination` (ui) | Query params |
| Workload color badges | `/dashboard` | `DashboardClient` | Inline logic |

### 3. Member Profile

| Feature | Page | Components | API |
|---------|------|------------|-----|
| Profile header (avatar, name, role, teams, usernames) | `/members/[id]` | `MemberProfileClient` | `GET /api/members/:id` |
| Platform filter (All/GitHub/GitLab) | `/members/[id]` | `MemberProfileClient` | Query params |
| Time window selector (All/30d/90d/180d) | `/members/[id]` | `MemberProfileClient` | `days` param |
| Stats cards (Open, Created, Assigned, Resolved, Stale) | `/members/[id]` | `MemberProfileClient` | `GET /api/members/:id/stats` |
| Resolution activity heatmap | `/members/[id]` | `ActivityChart` (ApexCharts) | `GET /api/members/:id/timeline` |
| Repository activity table | `/members/[id]` | `MemberProfileClient` | `GET /api/members/:id/repositories` |
| Issue list (tabs: All/Open/Resolved/Created) | `/members/[id]` | `MemberProfileClient` | `GET /api/members/:id/issues` |
| Stale issue badges | `/members/[id]` | `MemberProfileClient` | Inline from API |

### 4. Reports

| Feature | Page | Components | API |
|---------|------|------------|-----|
| Monthly report table (By Member) | `/reports` | `ReportsClient` | `GET /api/reports/monthly` |
| Team-grouped report (By Team) | `/reports` | `ReportsClient` | `GET /api/reports/monthly?groupBy=team` |
| Custom date range | `/reports` | `ReportsClient` | `start` + `end` params |
| Name filter | `/reports` | `ReportsClient` | Query param |
| Repository filter | `/reports` | `ReportsClient` | Query param |
| Platform filter | `/reports` | `ReportsClient` | Query param |
| Sorting by metric | `/reports` | `ReportsClient` | Query params |
| Pagination | `/reports` | `Pagination` (ui) | Query params |
| CSV export | `/reports` | `ReportsClient` (button) | `GET /api/reports/export` |
| Grand totals row | `/reports` | `ReportsClient` | From API response |

### 5. Admin — Members

| Feature | Page | Components | API |
|---------|------|------------|-----|
| Member list table | `/admin/members` | `AdminMembersClient` | `GET /api/members` |
| Active/Inactive/All filter | `/admin/members` | `AdminMembersClient` | Query param |
| Sorting | `/admin/members` | `Inline table` | Client-side sort |
| Create member form | `/admin/members/new` | `MemberForm` | `POST /api/members` |
| Edit member form | `/admin/members/[id]/edit` | `MemberForm` | `GET + PATCH /api/members/:id` |
| Team assignment (pills) | MemberForm | `MemberForm` | `GET /api/teams`, `POST/DELETE /api/teams/:id/members` |
| Activate/Deactivate toggle | `/admin/members` | `AdminMembersClient` | `PATCH /api/members/:id` |
| Delete member | `/admin/members` | `AdminMembersClient` | `DELETE /api/members/:id` |
| Kerjabaik managed mode | All admin pages | `AdminMembersClient`, `MemberForm` | Feature flag |

### 6. Admin — Teams

| Feature | Page | Components | API |
|---------|------|------------|-----|
| Team list (left panel) | `/admin/teams` | `AdminTeamsClient` | `GET /api/teams` |
| Create team | `/admin/teams` | `AdminTeamsClient` | `POST /api/teams` |
| Rename team | `/admin/teams` | `AdminTeamsClient` | `PATCH /api/teams/:id` |
| Delete team | `/admin/teams` | `AdminTeamsClient` | `DELETE /api/teams/:id` |
| Member list (right panel) | `/admin/teams` | `AdminTeamsClient` | `GET /api/members?teamId=:id` |
| Add member to team | `/admin/teams` | `AdminTeamsClient` | `POST /api/teams/:id/members` |
| Remove member from team | `/admin/teams` | `AdminTeamsClient` | `DELETE /api/teams/:id/members/:memberId` |
| Pagination | `/admin/teams` | `Pagination` (ui) | Client-side |

### 7. Admin — Repositories

| Feature | Page | Components | API |
|---------|------|------------|-----|
| Repository list table | `/admin/repositories` | `AdminReposClient` | `GET /api/repositories` |
| Platform filter | `/admin/repositories` | `AdminReposClient` | Query param |
| Ignored status filter | `/admin/repositories` | `AdminReposClient` | Query param |
| Ignore/Unignore toggle | `/admin/repositories` | `AdminReposClient` | `PATCH /api/repositories/:id` |
| Sorting | `/admin/repositories` | `Inline table` | Client-side |
| Pagination | `/admin/repositories` | `Pagination` (ui) | Client-side |

### 8. Admin — Settings

| Feature | Page | Components | API |
|---------|------|------------|-----|
| Stale issue threshold | `/admin/settings` | `SettingsClient` | `GET + PATCH /api/settings` |
| Workload thresholds (low/max, medium max) | `/admin/settings` | `SettingsClient` | `GET + PATCH /api/settings` |
| Live threshold preview | `/admin/settings` | `SettingsClient` | Inline calculation |
| Save confirmation | `/admin/settings` | `SettingsClient` | Internal state |

### 9. Sidebar & Navigation

| Feature | Component | API |
|---------|-----------|-----|
| Logo + branding | `Sidebar`, `Logo` | — |
| Navigation menu (role-filtered) | `Sidebar`, `MenuItem` | — |
| Admin section (Members, Teams, Repos, Settings) | `Sidebar` | — |
| Developer nav (Dashboard, Reports, My Profile) | `Sidebar` | — |
| Trigger Sync button | `Sidebar` | `POST /api/sync`, `GET /api/sync?jobId=...`, `GET /api/sync/status` |
| Sync progress (SSE stream) | `Sidebar` | `GET /api/sync?jobId=...` |
| Last synced timestamp | `Sidebar` | `GET /api/sync/status` |
| Mobile hamburger toggle | `Header`, `SidebarContext` | — |
| Theme toggle (dark/light) | `ThemeToggleSwitch` | — |
| User dropdown (name, avatar, role, profile link, sign out) | `UserInfo` | `useSession()`, `signOut()` |

### 10. Sync Engine

| Feature | Files | Trigger |
|---------|-------|---------|
| GitHub issue fetch | `src/lib/github.ts` | Sync run |
| GitLab issue fetch | `src/lib/gitlab.ts` | Sync run |
| Core sync logic | `src/lib/sync.ts` | Worker thread |
| Worker thread manager | `src/lib/sync-manager.ts` | `POST /api/sync` |
| Cron scheduler | `scripts/sync-cron.ts` | `node-cron` hourly |
| Worker thread entry | `scripts/sync-worker.ts` | Spawned by manager |
| Kerjabaik sync | `src/lib/sync-kerjabaik.ts` | Sync run (`source=kerjabaik`) |
| Worker bundler | `scripts/build-worker.mjs` | Build step |

### 11. External Integration (Kerjabaik)

| Feature | API | Auth |
|---------|-----|------|
| Employee metrics endpoint | `GET /api/external/employees/:id/metrics` | Bearer token |
| Employee data sync | `src/lib/kerjabaik.ts` | `KERJABAIK_SERVICE_TOKEN` |
| Project-to-team sync | `src/lib/sync-kerjabaik.ts` | `KERJABAIK_SERVICE_TOKEN` |

---

## Component Tree

```
RootLayout
└── Providers (SessionProvider, ThemeProvider)
    └── NextTopLoader
        └── (app)/layout.tsx
            ├── Header
            │   ├── MenuIcon (mobile hamburger)
            │   ├── Logo (mobile only)
            │   ├── ThemeToggleSwitch
            │   ├── Notification (bell icon, hardcoded)
            │   └── UserInfo (avatar dropdown)
            ├── Sidebar
            │   ├── Logo
            │   ├── MenuItem[] (Dashboard, Reports, Admin...)
            │   ├── Trigger Sync button
            │   └── Sync progress display
            └── Page Content
                ├── DashboardClient
                │   ├── Summary cards
                │   ├── Filter bar (team, repo, platform, active, name)
                │   ├── Table (Member, Role, Teams, Open Issues, Workload)
                │   └── Pagination
                ├── MemberProfileClient
                │   ├── Profile header card
                │   ├── Stats cards
                │   ├── ActivityChart (ApexCharts heatmap)
                │   ├── Repository table
                │   └── Issue list (tabs, pagination, stale badges)
                ├── ReportsClient
                │   ├── Mode toggle (monthly/custom)
                │   ├── Filter bar (name, repo, platform, view mode)
                │   ├── Table (member or team-grouped)
                │   └── Pagination
                ├── AdminMembersClient
                │   ├── Filter pills (All/Active/Inactive)
                │   └── Table (member list + actions)
                ├── MemberForm
                │   ├── Form fields (name, usernames, role)
                │   └── Team pills selector
                ├── AdminTeamsClient
                │   ├── Left panel (team list + CRUD)
                │   └── Right panel (member list + add/remove)
                ├── AdminReposClient
                │   ├── Filter bar (platform, ignored)
                │   └── Table (repo list + ignore toggle)
                └── SettingsClient
                    ├── Stale threshold card
                    ├── Workload threshold card
                    └── Live preview table
```

---

## API → Component Mapping

| API Endpoint | Used By |
|---|---|
| `GET /api/dashboard` | `DashboardClient` |
| `GET /api/reports/monthly` | `ReportsClient` |
| `GET /api/reports/export` | `ReportsClient` (CSV button) |
| `GET /api/members` | `AdminMembersClient`, `AdminTeamsClient` |
| `POST /api/members` | `MemberForm` |
| `GET /api/members/:id` | `MemberProfileClient`, `MemberForm` |
| `PATCH /api/members/:id` | `MemberForm`, `AdminMembersClient` |
| `DELETE /api/members/:id` | `AdminMembersClient` |
| `GET /api/members/:id/issues` | `MemberProfileClient` |
| `GET /api/members/:id/stats` | `MemberProfileClient` |
| `GET /api/members/:id/timeline` | `ActivityChart` (via `MemberProfileClient`) |
| `GET /api/members/:id/repositories` | `MemberProfileClient` |
| `GET /api/teams` | `DashboardClient`, `MemberForm`, `AdminTeamsClient` |
| `POST /api/teams` | `AdminTeamsClient` |
| `PATCH /api/teams/:id` | `AdminTeamsClient` |
| `DELETE /api/teams/:id` | `AdminTeamsClient` |
| `POST /api/teams/:id/members` | `AdminTeamsClient`, `MemberForm` |
| `DELETE /api/teams/:id/members/:memberId` | `AdminTeamsClient`, `MemberForm` |
| `GET /api/repositories` | `AdminReposClient` |
| `GET /api/repositories?ignored=false` | `DashboardClient`, `ReportsClient` |
| `PATCH /api/repositories/:id` | `AdminReposClient` |
| `GET /api/settings` | `SettingsClient` |
| `PATCH /api/settings` | `SettingsClient` |
| `POST /api/sync` | `Sidebar` (Trigger Sync button) |
| `GET /api/sync?jobId=...` | `Sidebar` (SSE stream) |
| `GET /api/sync/status` | `Sidebar` (Last synced display) |
| `GET /api/users` | Admin pages (internal) |
| `GET /api/external/employees/:id/metrics` | Kerjabaik HR system (external) |
