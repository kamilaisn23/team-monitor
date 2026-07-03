# DEVELOPMENT PLAN — Team Monitor

---

## Phases

### MVP (Completed)

**Status:** Shipped

| Feature | Description |
|---------|-------------|
| GitHub OAuth SSO | Login via GitHub, auto-create TeamMember |
| Role-based access | UNASSIGNED → pending, DEVELOPER can view own data, MANAGER views all, ADMIN manages, SUPERADMIN has full control |
| Dashboard | Per-member workload overview with open-issue counts and workload level (low/medium/high) |
| Member profiles | Individual member pages with stats, issue history, activity heatmap, repo breakdown |
| Monthly reports | Aggregated stats per member/team with CSV export |
| Admin panel | CRUD for members, teams, repositories; settings for workload thresholds |
| GitHub sync | Org-wide issue search via GitHub Search API, hourly via cron |
| GitLab sync | Group-wide issue fetch via GitLab Group API |
| Background sync engine | Worker-thread-based, SSE progress streaming, cooldown enforcement |
| Workload thresholds | Configurable low/medium/high boundaries and stale-issue days |
| Dark mode | Via next-themes, toggle in header |

---

### V1 — Multi-Team (Planned)

See [`prd-multi-team.md`](./prd-multi-team.md) for full details.

| Phase | Features | Effort |
|-------|----------|--------|
| **Phase 1** | Repository ↔ Team assignment UI in admin | 1-2 days |
| **Phase 2** | Add `teamIds` to JWT/session | 0.5 day |
| **Phase 3** | Dashboard & Reports team auto-scoping, Reports team filter | 2-3 days |
| **Phase 4** | Sidebar team switcher, cookie persistence | 1-2 days |
| **Phase 5** | Polish: zero-team states, cross-team access denied, archived team handling | 1-2 days |

---

### V2 — Future Ideas

| Feature | Description |
|---------|-------------|
| PR review tracking | Track PRs separately from issues, measure review turnaround time |
| Sprint planning | Create sprints, assign issues, track velocity |
| Notification system | Email/Slack notifications for stale issues, high workload |
| Team-level settings | Per-team workload thresholds, per-team stale days |
| Public dashboards | Shareable read-only dashboard URLs for stakeholders |
| API rate limit dashboard | Show GitHub/GitLab rate limit status in admin |
| Bulk issue operations | Close/label multiple issues from the UI |
| Issue comments/activity | Show recent activity per issue |
| Mobile app | React Native or PWA for on-the-go monitoring |

---

## Coding Conventions

### TypeScript
- Strict mode (`strict: true`, `noUncheckedIndexedAccess: true`)
- Path aliases: `@/*` maps to `src/*`
- Client components marked with `'use client'`
- Server components are the default (no directive needed)

### Component Patterns
- **Client components**: Used when state, effects, or browser APIs are needed (`DashboardClient`, `ReportsClient`, `Sidebar`, etc.)
- **Server components**: Page files that fetch data and pass to client components
- **Data fetching**: Client components call API routes via `fetch()`
- **Auth in client**: `useSession()` from `next-auth/react`
- **Auth in server**: `auth()` from `@/lib/auth` or `session.ts` helpers

### Prisma Queries
- Use `mode: 'insensitive'` for case-insensitive text search
- Use `_count` for relation counts
- Use `include` or `select` for relation data
- Transactions for multi-step writes (`prisma.$transaction`)

### API Routes
- Return `NextResponse.json()` for all responses
- Error shape: `{ error: "message" }`
- Auth check: `const session = await auth()` at top of handler
- Role check: use `session.ts` helpers
- Pagination: `page`/`limit` query params, default `page=1`, `limit=10`, max `limit=100`

### Dates
- All stored timestamps are UTC
- WIB (UTC+7) conversions for reporting via `src/lib/wib.ts`
- Display formatting via `dayjs`

### Logging
- Server scripts use `console.log` / `console.error` with `[prefix]` format
- Prisma client logs `error` level only

### File Naming
- Components: PascalCase (`DashboardClient.tsx`)
- Lib files: kebab-case (`sync-manager.ts`)
- Hooks: kebab-case with `use-` prefix (`use-mobile.ts`)
- Types: `index.ts` in `types/` folder

---

## Tooling

| Tool | Command | Purpose |
|------|---------|---------|
| ESLint | `npm run lint` | Code quality |
| TypeScript | `npm run typecheck` | Type checking |
| Prisma | `npx prisma generate` | Regenerate client |
| Prisma | `npx prisma migrate dev` | Dev migration |
| Prisma | `npx prisma studio` | DB GUI |
| esbuild | `npm run build-worker` (in scripts) | Bundle sync worker |

---

## Testing

No automated test framework is currently configured. Manual verification:

1. `npm run typecheck` — after TypeScript changes
2. `npm run lint` — after code changes
3. `npm run dev` — verify server starts
4. `npm run sync` — verify sync runs without errors
5. `docker compose up --build` — verify Docker deployment

---

## CI/CD (Suggested)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx prisma generate
      - run: npm run typecheck
      - run: npm run lint
```

---

## Deployment Checklist

- [ ] `.env` populated with all required variables
- [ ] `AUTH_SECRET` is not the placeholder value
- [ ] `SUPERADMIN_GITHUB_USERNAME` is set correctly
- [ ] GitHub OAuth app callback URL matches `NEXTAUTH_URL`
- [ ] PostgreSQL is running and `DATABASE_URL` is correct
- [ ] Migrations applied: `npx prisma migrate deploy`
- [ ] Sync worker bundles built: `scripts/build-worker.mjs`
- [ ] GitHub token has `repo` and `read:org` scopes
- [ ] Cron schedule set (if using sync container)
