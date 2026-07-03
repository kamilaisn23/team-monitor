# STATE MANAGEMENT — Team Monitor

> This is a Next.js App Router application. State is split across server-side (RSC, cookies, JWT) and client-side (React state, URL params, context).

---

## Table of Contents

1. [State Architecture](#state-architecture)
2. [Server-Side State](#server-side-state)
3. [Client-Side State](#client-side-state)
4. [Global Context State](#global-context-state)
5. [URL State](#url-state)
6. [Auth State](#auth-state)
7. [Sync State](#sync-state)
8. [Caching Strategy](#caching-strategy)

---

## State Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     State Layers                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Server (Database)                                        │
│  ├─ Settings (workload thresholds, stale days)           │
│  ├─ TeamMember (users, roles)                            │
│  ├─ Team / TeamMembership                                │
│  ├─ Repository / RepositoryTeam                          │
│  ├─ Issue / IssueAssignee                                │
│  └─ SyncJob                                              │
│                                                          │
│  Server (JWT Cookie)                                     │
│  └─ Session { role, isSuperadmin, id, name, image }     │
│                                                          │
│  Server (In-Memory)                                      │
│  ├─ Settings cache (5-min TTL)                           │
│  └─ Sync job map (active jobs)                           │
│                                                          │
│  Client (React Context)                                  │
│  ├─ SessionProvider (next-auth)                          │
│  ├─ ThemeProvider (next-themes)                          │
│  └─ SidebarContext (open/close/mobile)                   │
│                                                          │
│  Client (React useState)                                 │
│  ├─ Dashboard filters + sort + pagination                │
│  ├─ Reports filters + date range + view mode             │
│  ├─ Member profile filters + time window                 │
│  ├─ Admin page filters + CRUD state                      │
│  └─ UI state (loading, error, modals)                    │
│                                                          │
│  Client (URL Query Params)                               │
│  └─ (future) team filter, page, sort in URL for sharing  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Server-Side State

### Database (PostgreSQL via Prisma)

All persistent state is stored in PostgreSQL. See `DATA_CATALOG.md` for the full schema.

**Key patterns:**
- `settings` table: key-value pairs for workload thresholds. Cached in memory for 5 minutes.
- All CRUD operations are transactional where multi-table writes are needed.
- `sync_jobs` table: tracks background job state. Orphaned `"running"` jobs are reset to `"error"` on server start.

### Server In-Memory

**Settings cache** (`src/lib/settings.ts`):
| Variable | TTL | Purpose |
|----------|-----|---------|
| `cachedThresholds` | 5 minutes | Workload threshold values |
| `cacheTimestamp` | — | Last cache write time |

**Sync job map** (`src/lib/sync-manager.ts`):
| Variable | Purpose |
|----------|---------|
| `jobs` (Map) | In-memory sync job registry (`SyncJob[]`) |
| `lastSyncFinishedAt` | Timestamp for cooldown check |

---

## Client-Side State

### Per-Page Internal State

Each page-level client component manages its own state via `useState`:

#### DashboardClient
```typescript
teamFilter: string          // selected team ID
repoFilter: string          // selected repo ID
platformFilter: "all" | "github" | "gitlab"
activeFilter: "active" | "inactive" | "all"
nameFilter: string          // text search
page: number                // current page
sortCol: string             // sort column
sortDir: "asc" | "desc"     // sort direction
data: { total, data[] }     // API response
teams: Team[]               // dropdown data
repos: Repository[]         // dropdown data
loading: boolean
```

#### ReportsClient
```typescript
mode: "monthly" | "custom"
month: string               // YYYY-MM
startDate: string
endDate: string
name: string
repoId: string
platform: string
viewMode: "member" | "team"
page: number
sort: string
sortDir: "asc" | "desc"
```

#### MemberProfileClient
```typescript
platform: "all" | "github" | "gitlab"
days: 0 | 30 | 90 | 180
issuesPage: number
// Data loaded from 5 API endpoints
```

#### Admin Clients
```typescript
// AdminMembersClient
activeFilter: "all" | "active" | "inactive"
members: Member[]
showDeleteModal: boolean
memberToDelete: string | null

// AdminTeamsClient
selectedTeamId: string | null
teams: Team[]
teamMembers: Member[]
availableMembers: Member[]
showDeleteModal: boolean

// AdminReposClient
platformFilter: "all" | "GITHUB" | "GITLAB"
ignoredFilter: "false" | "all" | "true"
repos: Repository[]

// SettingsClient
lowMax: number
mediumMax: number
staleDays: number
error: string | null
saved: boolean
```

### Data Fetching Pattern

All page-level components follow the same pattern:

```typescript
useEffect(() => {
    fetch("/api/endpoint?" + new URLSearchParams(filters))
        .then(res => res.json())
        .then(data => setData(data))
        .catch(err => setError(err))
        .finally(() => setLoading(false));
}, [/* filter dependencies */]);
```

There is no global data cache (no React Query, SWR, or similar). Each page fetches fresh data on mount and when filters change.

---

## Global Context State

### SessionProvider (next-auth/react)

```typescript
// Provided in src/app/providers.tsx
<SessionProvider>
```

Access via `useSession()`:
```typescript
const { data: session, status } = useSession();
// session.user: { id?, name?, image?, role, isSuperadmin }
// status: "loading" | "authenticated" | "unauthenticated"
```

Used by:
- `Sidebar` — role-based nav filtering
- `UserInfo` — display name, avatar, role, profile link
- `MemberProfileClient` — access control (DEVELOPER can only see own profile)

### ThemeProvider (next-themes)

```typescript
// Provided in src/app/providers.tsx
<ThemeProvider attribute="class" defaultTheme="light">
```

Access via `useTheme()`:
```typescript
const { theme, setTheme } = useTheme();
// theme: "light" | "dark" | "system"
```

Used by:
- `ThemeToggleSwitch` — toggles dark/light mode

### SidebarContext (custom)

```typescript
// Provided in (app)/layout.tsx
<SidebarProvider defaultOpen={true}>
```

Access via `useSidebarContext()`:
```typescript
const { isOpen, setIsOpen, isMobile, toggleSidebar } = useSidebarContext();
// isOpen: boolean — sidebar expanded/collapsed
// isMobile: boolean — viewport < 850px
```

Used by:
- `Sidebar` — controls visibility and mobile overlay
- `Header` — hamburger toggle on mobile

---

## URL State

Currently, **no state is stored in the URL**. All filters, pagination, and sort state are component-internal `useState`. This means:

- Refreshing the page resets all filters to defaults
- Sharing a filtered dashboard view is not possible via URL
- Browser back/forward navigation is unaware of filter changes

**Future improvement:** Use `useSearchParams()` and `useRouter()` to sync filters to URL query params, enabling shareable links and browser history.

---

## Auth State

### JWT Token (cookie)

Stored in a secure HTTP-only cookie. Contains:

```typescript
token: {
    login: string,           // GitHub username
    role: AppRole,           // from DB or "SUPERADMIN" for env-based
    isSuperadmin: boolean,   // env-based match
    memberId?: string,       // TeamMember DB id (absent for superadmin)
    // ... standard JWT fields (sub, iat, exp)
}
```

### Session (client + server)

Derived from JWT on each request. Shape:

```typescript
session: {
    user: {
        name?: string,
        email?: string,
        image?: string,
        role: AppRole,
        isSuperadmin: boolean,
        id?: string,         // TeamMember id
    }
}
```

**Refresh:** The JWT callback re-reads the role from DB on every `update` trigger. Admin role changes take effect on next session refresh or sign-in.

---

## Sync State

### Server-Side Job State

Managed in `src/lib/sync-manager.ts`:

```typescript
interface SyncJob {
    id: string;
    status: "running" | "done" | "error";
    events: SyncProgressEvent[];    // Replay buffer for late SSE connections
    listeners: Set<(event) => void>; // Active SSE listeners
}
```

**Cooldown:** A 5-minute cooldown is enforced between sync runs. `lastSyncFinishedAt` is checked on each `POST /api/sync` request.

### Client-Side Sync State (Sidebar)

```typescript
const [syncing, setSyncing] = useState(false);
const [syncProgress, setSyncProgress] = useState<string | null>(null);
const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
```

**Flow:**
1. User clicks "Trigger Sync" → `POST /api/sync` → get `jobId`
2. Open SSE connection → `GET /api/sync?jobId={jobId}`
3. Stream progress events → update `syncProgress` text
4. On `"done"` / `"error"` → set `syncing = false`, fetch `lastSyncedAt`, auto-clear progress after 10 seconds

---

## Caching Strategy

| Layer | Scope | TTL | What |
|-------|-------|-----|------|
| Settings cache | Server memory | 5 min | Workload thresholds, stale days |
| GitLab project URL cache | Server memory | Process lifetime | Resolved project URLs |
| Next.js fetch cache | Built-in | Route segment config | API fetch deduplication |
| Client-side | Per-component state | Until page navigation or filter change | All API responses |

**No SWR/React Query.** All client data fetching is bare `fetch()` with `useState`/`useEffect`. Data is refetched on:
- Component mount
- Filter/sort/page state change
- Manual refresh (sync trigger updates `lastSyncedAt`)

---

## Loading & Error States

### Loading
- Dashboard, Reports, Admin pages: toggle between `<Skeleton>` / spinner and content based on `loading` state
- Member profile: shows skeleton cards while fetching

### Error
- API errors are caught in `.catch()` and typically show inline error text
- No global error boundary or toast notification system
- Sync errors show inline in the sidebar progress text for 10 seconds
