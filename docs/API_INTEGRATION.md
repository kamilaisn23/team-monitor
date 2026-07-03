# API INTEGRATION — Team Monitor

> How the frontend calls backend API routes, including HTTP client setup, authentication, and patterns.

---

## Table of Contents

1. [HTTP Client](#http-client)
2. [Authentication](#authentication)
3. [API Call Patterns](#api-call-patterns)
4. [API Modules by Page](#api-modules-by-page)
5. [Error Handling](#error-handling)
6. [TypeScript Types](#typescript-types)

---

## HTTP Client

This project uses **native `fetch()`** — no axios, no `$fetch`. All API calls are made directly from client components.

### Base URL

API routes are called relative to the same origin:

```typescript
fetch("/api/dashboard?page=1&limit=10")
```

No base URL override is needed because the Next.js app serves both the frontend and API from the same server.

### Request Headers

No custom headers are needed for standard API calls. The NextAuth session cookie is sent automatically by the browser.

```typescript
// Standard call — cookies sent automatically
const res = await fetch("/api/dashboard?" + params);
```

---

## Authentication

### Session Cookie

NextAuth.js sets an HTTP-only session cookie. All `fetch()` calls to `/api/*` include this cookie automatically (same-origin).

### Client-Side Session Access

```typescript
import { useSession } from "next-auth/react";

const { data: session, status } = useSession();

session.user.role         // "ADMIN" | "MANAGER" | "DEVELOPER" | "UNASSIGNED" | "SUPERADMIN"
session.user.isSuperadmin // boolean
session.user.id           // TeamMember UUID string
session.user.name         // Display name
session.user.image        // GitHub avatar URL
```

Used for:
- Role-based UI rendering (show/hide admin links)
- Access control (DEVELOPER can only view own profile)
- Display (avatar, name in header)

### Server-Side Session Access

```typescript
import { auth } from "@/lib/auth";

const session = await auth();
// session.user: { role, isSuperadmin, id, name, image }
```

Used in all API route handlers to check authentication and authorization.

---

## API Call Patterns

### Pattern 1: Fetch on Mount + Filter Changes

```typescript
// DashboardClient.tsx
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [teamFilter, setTeamFilter] = useState("");

useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortCol,
        sortDir,
    });
    if (teamFilter) params.set("teamId", teamFilter);
    if (repoFilter) params.set("repositoryId", repoFilter);
    // ...

    fetch(`/api/dashboard?${params}`)
        .then(res => res.json())
        .then(json => setData(json))
        .finally(() => setLoading(false));
}, [teamFilter, repoFilter, platformFilter, activeFilter, nameFilter, page, sortCol, sortDir]);
```

### Pattern 2: Load Dropdown Options

```typescript
// Populate filter dropdowns on mount
useEffect(() => {
    fetch("/api/teams")
        .then(r => r.json())
        .then(setTeams);

    fetch("/api/repositories?ignored=false")
        .then(r => r.json())
        .then(setRepos);
}, []);
```

### Pattern 3: CRUD Operations

```typescript
// Create
const res = await fetch("/api/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, role, usernameGithub }),
});
if (!res.ok) throw new Error((await res.json()).error);
router.push("/admin/members");

// Update
const res = await fetch(`/api/members/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, role }),
});

// Delete
const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
```

### Pattern 4: SSE Stream (Sync Progress)

```typescript
// Trigger sync
const startRes = await fetch("/api/sync", { method: "POST" });
const { jobId } = await startRes.json();

// Stream progress
const sseRes = await fetch(`/api/sync?jobId=${jobId}`);
const reader = sseRes.body.getReader();
const decoder = new TextDecoder();

// Read chunks, parse SSE format: "data: {...}\n\n"
// Event types: "start", "member_start", "member_done", "resolving", "done", "error"
```

### Pattern 5: File Download (CSV)

```typescript
// Trigger browser download
const params = new URLSearchParams({ month, platform, ... });
window.location.href = `/api/reports/export?${params}`;
```

---

## API Modules by Page

### Dashboard (`DashboardClient`)

```typescript
// Load filter dropdowns
GET /api/teams
GET /api/repositories?ignored=false

// Load member workload data
GET /api/dashboard?teamId=&repositoryId=&platform=&active=&page=&limit=&sortCol=&sortDir=&name=
```

### Reports (`ReportsClient`)

```typescript
// Load repo filter
GET /api/repositories?ignored=false

// Load report data
GET /api/reports/monthly?month=&start=&end=&repositoryId=&name=&platform=&groupBy=&page=&limit=&sort=&sortDir=

// Export CSV
GET /api/reports/export?month=&start=&end=&repositoryId=&name=&platform=
```

### Member Profile (`MemberProfileClient`)

```typescript
// All fetched in parallel on mount
GET /api/members/:id
GET /api/members/:id/stats?month=&days=&platform=
GET /api/members/:id/timeline?days=&platform=
GET /api/members/:id/repositories?days=&platform=
GET /api/members/:id/issues?state=&platform=&month=&type=&page=&limit=
```

### Admin Members (`AdminMembersClient`, `MemberForm`)

```typescript
// List
GET /api/members?role=&teamId=&active=

// Create
POST /api/members    body: { name, usernameGithub?, usernameGitlab?, role }

// Read
GET /api/members/:id

// Update
PATCH /api/members/:id   body: { name?, usernameGithub?, usernameGitlab?, role?, isActive? }

// Delete
DELETE /api/members/:id

// For team membership in MemberForm:
GET /api/teams
POST /api/teams/:teamId/members   body: { memberId }
DELETE /api/teams/:teamId/members/:memberId
```

### Admin Teams (`AdminTeamsClient`)

```typescript
// List
GET /api/teams

// Create
POST /api/teams   body: { name }

// Rename
PATCH /api/teams/:id   body: { name }

// Delete
DELETE /api/teams/:id

// Load members of team
GET /api/members?teamId=:teamId

// Load all members (for add dropdown)
GET /api/members

// Add/remove members
POST /api/teams/:teamId/members   body: { memberId }
DELETE /api/teams/:teamId/members/:memberId
```

### Admin Repositories (`AdminReposClient`)

```typescript
// List
GET /api/repositories?platform=&ignored=

// Toggle ignored
PATCH /api/repositories/:id   body: { ignored: boolean }
```

### Admin Settings (`SettingsClient`)

```typescript
// Load
GET /api/settings    →  { lowMax, mediumMax, staleDays }

// Save
PATCH /api/settings  →  body: { lowMax, mediumMax, staleDays }
```

### Sidebar

```typescript
// Last sync timestamp
GET /api/sync/status   →  { lastSyncedAt }

// Trigger sync
POST /api/sync?source=all

// Sync progress stream
GET /api/sync?jobId=:jobId   (SSE)
```

---

## Error Handling

### Standard Error Format

All API routes return errors as:
```json
{ "error": "Human-readable error message" }
```

### Client-Side Handling

```typescript
fetch("/api/endpoint")
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => {
                throw new Error(err.error || "Request failed");
            });
        }
        return res.json();
    })
    .then(data => setData(data))
    .catch(err => {
        setError(err.message);
        setLoading(false);
    });
```

**Common patterns:**
- Form submissions: show inline error text below the form
- Dashboard/Reports: show error text in place of the table
- Sync: show error in sidebar progress text for 10 seconds
- Generic: `console.error` for debugging

### HTTP Status Codes

| Status | Meaning | Typical Cause |
|--------|---------|---------------|
| `200` | Success | GET requests return data |
| `201` | Created | POST requests return new entity |
| `202` | Accepted | Sync job queued |
| `204` | No Content | DELETE success |
| `400` | Bad Request | Missing/invalid parameters |
| `401` | Unauthorized | Not logged in or invalid session |
| `403` | Forbidden | Insufficient role |
| `404` | Not Found | Entity doesn't exist |
| `409` | Conflict | Duplicate username, already in team, Kerjabaik-managed, sync already running |
| `429` | Too Many Requests | Sync cooldown active (includes `Retry-After` header) |
| `500` | Internal Server Error | Unexpected server error |

---

## TypeScript Types

### Core Types (`src/types/index.ts`)

```typescript
export type AppRole = "SUPERADMIN" | "ADMIN" | "MANAGER" | "DEVELOPER" | "UNASSIGNED";
export type WorkloadLevel = "low" | "medium" | "high";
```

### NextAuth User Type Extension

```typescript
// Augmented on session.user
interface User {
    id?: string;         // TeamMember.id
    role: AppRole;       // Always present
    isSuperadmin: boolean; // Always present
}
```

### API Response Types (inline, not exported)

Types are defined inline in components rather than in a shared types file:

```typescript
// Dashboard
type DashboardMember = {
    memberId: string;
    name: string;
    avatarUrl: string | null;
    role: string;
    isActive: boolean;
    teams: { id: string; name: string }[];
    currentLoad: number;
    workloadLevel: "low" | "medium" | "high";
};

// Reports
type ReportRow = {
    memberId: string;
    name: string;
    avatarUrl: string | null;
    role: string;
    teamIds: string[];
    teamNames: string[];
    issuesCreated: number;
    issuesAssigned: number;
    issuesResolved: number;
    issuesStillOpen: number;
};

// Settings
type Thresholds = {
    lowMax: number;
    mediumMax: number;
    staleDays: number;
};

// Sync
type SyncStatus = {
    running: boolean;
    cooldownSecondsRemaining: number;
};
```

### Team / Repository Types

```typescript
type Team = {
    id: string;
    name: string;
    kerjabaikProjectId?: string;
    isArchived: boolean;
    createdAt: string;
    memberCount: number;
};

type Repository = {
    id: string;
    platform: "GITHUB" | "GITLAB";
    name: string;
    url: string;
    ignored: boolean;
    discoveredAt: string;
    teams: { id: string; name: string }[];
};
```

### Member Types

```typescript
type Member = {
    id: string;
    name: string;
    kerjabaikEmployeeId?: string;
    usernameGithub?: string;
    usernameGitlab?: string;
    role: string;
    avatarUrl?: string;
    isActive: boolean;
    lastLoginAt?: string;
    teams: { id: string; name: string }[];
};
```
