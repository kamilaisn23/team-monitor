# API CONTRACTS — Team Monitor

> All endpoints are prefixed with `/api`. Auth is managed by NextAuth.js v5 (GitHub OAuth).

---

## Table of Contents

1. [Authentication](#authentication)
2. [Dashboard](#dashboard)
3. [Reports](#reports)
4. [Members](#members)
5. [Teams](#teams)
6. [Repositories](#repositories)
7. [Settings](#settings)
8. [Sync](#sync)
9. [Users (Admin)](#users-admin)
10. [External (Kerjabaik)](#external-kerjabaik)

---

## Authentication

All endpoints except `[...nextauth]` and `external/employees/*` require a valid NextAuth session cookie. Unauthenticated requests receive `401`.

### GET/POST `/api/auth/[...nextauth]`

NextAuth.js handler. Manages sign-in, callback, sign-out, and session.

**Provider:** GitHub OAuth  
**Callback URL:** `{NEXTAUTH_URL}/api/auth/callback/github`

**Sign-in flow:**
1. User visits `/login`, clicks "Sign in with GitHub"
2. Redirected to GitHub for authorization
3. On callback, app upserts `TeamMember` row (new users get `UNASSIGNED` role)
4. JWT is enriched with `role`, `isSuperadmin`, `memberId`
5. Session cookie set, redirected to `/dashboard`

**Session shape:**
```json
{
  "user": {
    "id": "clx...",
    "name": "John Doe",
    "email": null,
    "image": "https://avatars.githubusercontent.com/u/...",
    "role": "MANAGER",
    "isSuperadmin": false
  }
}
```

---

## Dashboard

### `GET /api/dashboard`

Returns paginated member workload list.

**Auth:** All roles except `UNASSIGNED`

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `teamId` | `string` | — | Filter members belonging to this team |
| `repoTeamId` | `string` | — | Filter repositories tagged to this team |
| `repositoryId` | `string` | — | Filter to issues in this specific repo |
| `platform` | `"all" \| "github" \| "gitlab"` | `"all"` | Issue platform filter |
| `active` | `"true" \| "false"` | — | Filter by member active status |
| `name` | `string` | — | Case-insensitive name search |
| `page` | `number` | `1` | Page number (1-indexed) |
| `limit` | `number` | `10` | Items per page (max 100) |
| `sortCol` | `"name" \| "role" \| "currentLoad" \| "workloadLevel"` | `"name"` | Sort column |
| `sortDir` | `"asc" \| "desc"` | `"asc"` | Sort direction |

**Response `200`:**
```json
{
  "total": 25,
  "data": [
    {
      "memberId": "clx...",
      "name": "John Doe",
      "avatarUrl": "https://avatars.githubusercontent.com/u/...",
      "role": "DEVELOPER",
      "isActive": true,
      "teams": [
        { "id": "clx...", "name": "Kerjabaik" }
      ],
      "currentLoad": 5,
      "workloadLevel": "medium"
    }
  ]
}
```

**Errors:**
- `401` — `{ "error": "Unauthorized" }`
- `403` — `{ "error": "Forbidden" }`

---

## Reports

### `GET /api/reports/monthly`

Returns aggregated monthly stats per member or per team.

**Auth:** All roles except `UNASSIGNED`

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `month` | `string` | — | Month as `YYYY-MM` (e.g. `2026-07`) |
| `start` | `string` | — | Start date ISO string (alternative to `month`) |
| `end` | `string` | — | End date ISO string (must be after `start`) |
| `repositoryId` | `string` | — | Filter to issues in this repo |
| `name` | `string` | — | Case-insensitive name search |
| `platform` | `"all" \| "github" \| "gitlab"` | `"all"` | Platform filter |
| `groupBy` | `"team"` | — | If set, groups results by team |
| `page` | `number` | `1` | Page number (flat mode only) |
| `limit` | `number` | `10` | Items per page (max 100) |
| `sort` | `string` | `"issuesResolved"` | Sort column |
| `sortDir` | `"asc" \| "desc"` | `"desc"` | Sort direction |

**Sort columns:** `name`, `role`, `issuesCreated`, `issuesAssigned`, `issuesResolved`, `issuesStillOpen`

**Response `200` (flat mode):**
```json
{
  "month": "2026-07",
  "total": 18,
  "totals": {
    "issuesCreated": 45,
    "issuesAssigned": 60,
    "issuesResolved": 38,
    "issuesStillOpen": 72
  },
  "data": [
    {
      "memberId": "clx...",
      "name": "John Doe",
      "avatarUrl": "https://...",
      "role": "DEVELOPER",
      "teamIds": ["clx..."],
      "teamNames": ["Kerjabaik"],
      "issuesCreated": 12,
      "issuesAssigned": 15,
      "issuesResolved": 10,
      "issuesStillOpen": 8
    }
  ]
}
```

**Response `200` (team mode):**
```json
{
  "month": "2026-07",
  "groups": [
    {
      "teamId": "clx...",
      "teamName": "Kerjabaik",
      "members": [
        {
          "memberId": "clx...",
          "name": "John Doe",
          "avatarUrl": "https://...",
          "role": "DEVELOPER",
          "issuesCreated": 12,
          "issuesAssigned": 15,
          "issuesResolved": 10,
          "issuesStillOpen": 8
        }
      ],
      "totals": {
        "issuesCreated": 45,
        "issuesAssigned": 60,
        "issuesResolved": 38,
        "issuesStillOpen": 72
      }
    }
  ]
}
```

**Errors:**
- `400` — `{ "error": "month or start+end is required" }`
- `400` — `{ "error": "start must be before end" }`
- `401` — `{ "error": "Unauthorized" }`
- `403` — `{ "error": "Forbidden" }`

---

### `GET /api/reports/export`

Downloads monthly report as CSV.

**Auth:** All roles except `UNASSIGNED`

**Query Parameters:** Same as `monthly` (without `page`, `limit`, `sort`, `sortDir`, `groupBy`)

**Response `200`:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="report-2026-07.csv"

Name,Role,Issues Created,Issues Assigned,Issues Resolved,Issues Still Open
John Doe,DEVELOPER,12,15,10,8
Jane Smith,MANAGER,5,8,6,3
```

**Errors:** Same as `monthly` (minus pagination-related)

---

## Members

### `GET /api/members`

Lists all team members.

**Auth:** All roles except `UNASSIGNED`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `role` | `string` | Filter by role (`ADMIN`, `MANAGER`, `DEVELOPER`) |
| `teamId` | `string` | Filter by team membership |
| `active` | `"true" \| "false"` | Filter by active status |

**Response `200`:**
```json
[
  {
    "id": "clx...",
    "name": "John Doe",
    "kerjabaikEmployeeId": "EMP-001",
    "usernameGithub": "johndoe",
    "usernameGitlab": "johndoe",
    "role": "DEVELOPER",
    "avatarUrl": "https://...",
    "isActive": true,
    "lastLoginAt": "2026-07-01T12:00:00.000Z",
    "teams": [
      { "id": "clx...", "name": "Kerjabaik" }
    ]
  }
]
```

**Errors:**
- `401` — `{ "error": "Unauthorized" }`
- `403` — `{ "error": "Forbidden" }`

---

### `POST /api/members`

Creates a new team member.

**Auth:** `ADMIN` or superadmin only  
**KerjaBaik:** Blocked (409) when KerjaBaik sync is enabled

**Request Body:**
```json
{
  "name": "John Doe",
  "usernameGithub": "johndoe",
  "usernameGitlab": null,
  "role": "DEVELOPER"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Display name |
| `usernameGithub` | `string \| null` | No | GitHub username |
| `usernameGitlab` | `string \| null` | No | GitLab username |
| `role` | `string` | Yes | `ADMIN`, `MANAGER`, `DEVELOPER`, or `UNASSIGNED` |

**Response `201`:**
```json
{
  "id": "clx...",
  "name": "John Doe",
  "usernameGithub": "johndoe",
  ...
}
```

**Errors:**
- `400` — `{ "error": "name is required" }`
- `400` — `{ "error": "role must be ADMIN, MANAGER, DEVELOPER, or UNASSIGNED" }`
- `401` — `{ "error": "Unauthorized" }`
- `403` — `{ "error": "Forbidden" }`
- `409` — `{ "error": "usernameGithub already taken" }`
- `409` — `{ "error": "usernameGitlab already taken" }`
- `409` — `{ "error": "managed_in_kerjabaik" }`
- `500` — `{ "error": "Internal server error" }`

---

### `GET /api/members/:id`

Returns a single member by ID.

**Auth:** Authenticated. `DEVELOPER` can only access their own profile.

**Response `200`:**
```json
{
  "id": "clx...",
  "name": "John Doe",
  "usernameGithub": "johndoe",
  "usernameGitlab": null,
  "role": "DEVELOPER",
  "avatarUrl": "https://...",
  "isActive": true,
  "createdAt": "2026-01-15T09:00:00.000Z",
  "lastLoginAt": "2026-07-01T12:00:00.000Z",
  "teams": [
    { "id": "clx...", "name": "Kerjabaik" }
  ]
}
```

**Errors:**
- `401` — `{ "error": "Unauthorized" }`
- `403` — `{ "error": "Forbidden" }`
- `404` — `{ "error": "Member not found" }`

---

### `PATCH /api/members/:id`

Updates a team member. Only provided fields are updated.

**Auth:** `ADMIN` or superadmin only  
**KerjaBaik:** Blocked (409)

**Request Body** (all fields optional):
```json
{
  "name": "John Updated",
  "usernameGithub": "johndoe2",
  "usernameGitlab": null,
  "role": "MANAGER",
  "isActive": false
}
```

**Response `200`:** Updated member object (same shape as `GET`)

**Errors:**
- `400` — `{ "error": "Invalid role" }`
- `401` — `{ "error": "Unauthorized" }`
- `403` — `{ "error": "Forbidden" }`
- `404` — `{ "error": "Member not found" }`
- `409` — `{ "error": "usernameGithub already taken by another member" }`
- `409` — `{ "error": "usernameGitlab already taken by another member" }`
- `409` — `{ "error": "managed_in_kerjabaik" }`
- `500` — `{ "error": "Internal server error" }`

---

### `DELETE /api/members/:id`

Deletes a team member.

**Auth:** `ADMIN` or superadmin only  
**KerjaBaik:** Blocked (409)

**Response `204`:** No content

**Errors:**
- `401` — `{ "error": "Unauthorized" }`
- `403` — `{ "error": "Forbidden" }`
- `404` — `{ "error": "Member not found" }`
- `409` — `{ "error": "managed_in_kerjabaik" }`

---

### `GET /api/members/:id/issues`

Returns paginated issues for a member.

**Auth:** Authenticated. `DEVELOPER` can only access own issues.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `state` | `"all" \| "open" \| "closed"` | `"all"` | Filter by issue state |
| `platform` | `"all" \| "github" \| "gitlab"` | `"all"` | Platform filter |
| `month` | `string` | — | Month filter as `YYYY-MM` (WIB) |
| `type` | `"all" \| "assigned" \| "created"` | `"all"` | Issue relationship to member |
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `20` | Items per page (max 100) |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "clx...",
      "title": "Fix login redirect bug",
      "url": "https://github.com/org/repo/issues/42",
      "state": "OPEN",
      "platform": "GITHUB",
      "repository": { "id": "clx...", "name": "be-kerjabaik" },
      "createdAt": "2026-06-15T09:00:00.000Z",
      "closedAt": null,
      "isCreator": false,
      "isAssignee": true,
      "daysOpen": 18,
      "isStale": false
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### `GET /api/members/:id/stats`

Returns aggregate stats for a member.

**Auth:** Authenticated. `DEVELOPER` can only access own stats.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `month` | `string` | Current month (WIB) | Month as `YYYY-MM` |
| `days` | `number` | — | Look-back window (overrides `month` if set) |
| `platform` | `"all" \| "github" \| "gitlab"` | `"all"` | Platform filter |

**Response `200`:**
```json
{
  "memberId": "clx...",
  "month": "2026-07",
  "platform": "all",
  "currentLoad": 5,
  "issuesCreated": 12,
  "issuesAssigned": 15,
  "issuesResolved": 10,
  "staleIssues": 2,
  "staleDays": 30
}
```

---

### `GET /api/members/:id/timeline`

Returns hourly-resolution closed-issue timeline for heatmap.

**Auth:** Authenticated. `DEVELOPER` can only access own timeline.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `days` | `number` | `90` | Look-back window (min 7, max 365) |
| `platform` | `"all" \| "github" \| "gitlab"` | `"all"` | Platform filter |

**Response `200`:**
```json
{
  "records": [
    { "date": "2026-07-01", "hour": 9, "count": 3 },
    { "date": "2026-07-01", "hour": 14, "count": 1 }
  ],
  "days": 90
}
```

---

### `GET /api/members/:id/repositories`

Returns repository activity breakdown for a member.

**Auth:** Authenticated. `DEVELOPER` can only access own data.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `days` | `number` | `0` (all time) | Look-back window |
| `platform` | `"all" \| "github" \| "gitlab"` | `"all"` | Platform filter |

**Response `200`:**
```json
[
  {
    "repositoryId": "clx...",
    "name": "be-kerjabaik",
    "platform": "GITHUB",
    "url": "https://github.com/Kedata-Indonesia/be-kerjabaik",
    "issuesCreated": 8,
    "issuesAssigned": 12,
    "issuesResolved": 6
  }
]
```

---

## Teams

### `GET /api/teams`

Lists all teams with member counts.

**Auth:** Authenticated (any role)

**Response `200`:**
```json
[
  {
    "id": "clx...",
    "name": "Kerjabaik",
    "kerjabaikProjectId": "PROJ-001",
    "isArchived": false,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "memberCount": 8
  }
]
```

**Errors:**
- `401` — `{ "error": "Unauthorized" }`

---

### `POST /api/teams`

Creates a new team.

**Auth:** `ADMIN` or superadmin only  
**KerjaBaik:** Blocked (409)

**Request Body:**
```json
{
  "name": "New Team"
}
```

**Response `201`:**
```json
{
  "id": "clx...",
  "name": "New Team",
  "isArchived": false,
  "createdAt": "2026-07-03T00:00:00.000Z"
}
```

**Errors:**
- `400` — `{ "error": "name is required" }`
- `401` — `{ "error": "Unauthorized" }`
- `403` — `{ "error": "Forbidden" }`
- `409` — `{ "error": "Team name already exists" }`
- `409` — `{ "error": "managed_in_kerjabaik" }`
- `500` — `{ "error": "Internal server error" }`

---

### `PATCH /api/teams/:id`

Renames a team.

**Auth:** `ADMIN` or superadmin only  
**KerjaBaik:** Blocked (409)

**Request Body:**
```json
{
  "name": "Renamed Team"
}
```

**Response `200`:** Updated team object

---

### `DELETE /api/teams/:id`

Deletes a team.

**Auth:** `ADMIN` or superadmin only  
**KerjaBaik:** Blocked (409)

**Response `204`:** No content

---

### `POST /api/teams/:id/members`

Adds a member to a team.

**Auth:** `ADMIN` or superadmin only  
**KerjaBaik:** Blocked (409)

**Request Body:**
```json
{
  "memberId": "clx..."
}
```

**Response `201`:**
```json
{
  "teamId": "clx...",
  "memberId": "clx..."
}
```

**Errors:**
- `400` — `{ "error": "memberId is required" }`
- `404` — `{ "error": "Team not found" }`
- `404` — `{ "error": "Member not found" }`
- `409` — `{ "error": "Member already in team" }`

---

### `DELETE /api/teams/:id/members/:memberId`

Removes a member from a team.

**Auth:** `ADMIN` or superadmin only  
**KerjaBaik:** Blocked (409)

**Response `204`:** No content

**Errors:**
- `404` — `{ "error": "Membership not found" }`

---

## Repositories

### `GET /api/repositories`

Lists all repositories.

**Auth:** Authenticated (any role)

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `platform` | `"GITHUB" \| "GITLAB"` | Filter by platform |
| `ignored` | `"true" \| "false"` | Filter by ignored status |
| `teamId` | `string` | Filter by team membership |

**Response `200`:**
```json
[
  {
    "id": "clx...",
    "platform": "GITHUB",
    "name": "be-kerjabaik",
    "url": "https://github.com/Kedata-Indonesia/be-kerjabaik",
    "ignored": false,
    "discoveredAt": "2026-01-15T09:00:00.000Z",
    "teams": [
      { "id": "clx...", "name": "Kerjabaik" }
    ]
  }
]
```

---

### `PATCH /api/repositories/:id`

Updates a repository (ignore toggle or team assignment).

**Auth:** `ADMIN` or superadmin only

**Request Body** (all fields optional):
```json
{
  "ignored": true,
  "teamIds": ["clx...", "clx..."]
}
```

When `teamIds` is provided, all existing `RepositoryTeam` rows are replaced.

**Response `200`:** Updated repository object with teams.

**Errors:**
- `401` — `{ "error": "Unauthorized" }`
- `403` — `{ "error": "Forbidden" }`
- `404` — `{ "error": "Repository not found" }`

---

## Settings

### `GET /api/settings`

Returns workload threshold settings.

**Auth:** Superadmin only (env-based `SUPERADMIN_GITHUB_USERNAME` match)

**Response `200`:**
```json
{
  "lowMax": 3,
  "mediumMax": 7,
  "staleDays": 30
}
```

| Field | Description |
|-------|-------------|
| `lowMax` | Max open issues for "low" workload |
| `mediumMax` | Max open issues for "medium" workload (above this = "high") |
| `staleDays` | Days after which an open issue is considered "stale" |

---

### `PATCH /api/settings`

Updates workload thresholds.

**Auth:** Superadmin only

**Request Body:**
```json
{
  "lowMax": 4,
  "mediumMax": 10,
  "staleDays": 14
}
```

**Validation:** `lowMax < mediumMax`. All values must be positive integers.

**Response `200`:**
```json
{
  "lowMax": 4,
  "mediumMax": 10,
  "staleDays": 14
}
```

**Errors:**
- `400` — `{ "error": "lowMax must be a positive integer" }`
- `400` — `{ "error": "mediumMax must be a positive integer" }`
- `400` — `{ "error": "lowMax must be less than mediumMax" }`
- `400` — `{ "error": "staleDays must be a positive integer" }`
- `401` — `{ "error": "Unauthorized" }`
- `403` — `{ "error": "Forbidden" }`

---

## Sync

### `POST /api/sync`

Triggers a background sync job.

**Auth:** Authenticated (any role)

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `source` | `"all" \| "kerjabaik" \| "github" \| "gitlab"` | `"all"` | Which sources to sync |

**Response `202`:**
```json
{
  "jobId": "job-xxx-yyy",
  "source": "all"
}
```

**Errors:**
- `401` — `{ "error": "Unauthorized" }`
- `409` — `{ "error": "A sync is already in progress" }`
- `429` — `{ "error": "Sync cooldown active. Please wait before syncing again.", "retryAfter": 120 }`

---

### `GET /api/sync`

Returns sync status (without `jobId`) or SSE stream (with `jobId`).

**Auth:** Authenticated (any role)

**Without `jobId` — Response `200`:**
```json
{
  "running": false,
  "cooldownSecondsRemaining": 0
}
```

**With `jobId` — Response `200` (SSE stream):**
```
Content-Type: text/event-stream

data: {"type":"start","total":12}
data: {"type":"member_start","index":0,"total":12,"name":"John Doe"}
data: {"type":"member_done","index":0,"total":12,"name":"John Doe","issues":5}
data: {"type":"resolving"}
data: {"type":"done","processed":12,"githubIssues":45,"gitlabIssues":20,"durationSeconds":"32.5"}
```

**Errors:**
- `401` — `{ "error": "Unauthorized" }`
- `404` — `{ "error": "Job not found" }`

---

### `GET /api/sync/status`

Returns last sync timestamp.

**Auth:** Authenticated (any role)

**Response `200`:**
```json
{
  "lastSyncedAt": "2026-07-03T10:30:00.000Z"
}
```

`lastSyncedAt` is `null` if no issues have ever been synced.

---

## Users (Admin)

### `GET /api/users`

Lists all users including `UNASSIGNED`. Used for admin member management.

**Auth:** `ADMIN` or superadmin only

**Response `200`:**
```json
[
  {
    "id": "clx...",
    "name": "Jane Smith",
    "usernameGithub": "janesmith",
    "usernameGitlab": null,
    "role": "UNASSIGNED",
    "avatarUrl": "https://...",
    "lastLoginAt": "2026-07-01T08:00:00.000Z",
    "teams": []
  }
]
```

---

## External (Kerjabaik)

### `GET /api/external/employees/:kerjabaikEmployeeId/metrics`

External integration endpoint for the Kerjabaik HR system. Returns workload metrics for a given employee.

**Auth:** Bearer token — must match one of the comma-separated values in `KERJABAIK_SERVICE_TOKENS` env var.

**Headers:**
```
Authorization: Bearer <service-token>
```

**Response `200`:**
```json
{
  "kerjabaik_employee_id": "EMP-001",
  "team_member_id": "clx...",
  "open_issues": 5,
  "closed_last_30d": 10,
  "workload_tier": "medium",
  "last_active_at": "2026-07-02T15:30:00.000Z",
  "as_of": "2026-07-03T10:30:00.000Z"
}
```

| Field | Description |
|-------|-------------|
| `open_issues` | Count of currently open assigned issues |
| `closed_last_30d` | Issues closed in the last 30 days |
| `workload_tier` | `low`, `medium`, or `high` |
| `last_active_at` | Most recent issue activity timestamp (null if no activity) |
| `as_of` | Snapshot timestamp |

**Errors:**
- `401` — `{ "error": "unauthorized" }`
- `404` — `{ "error": "not_found" }`
