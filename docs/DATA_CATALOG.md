# DATA CATALOG — Team Monitor

> Database: PostgreSQL 16 | ORM: Prisma 5 | Provider: `postgresql`

---

## Table of Contents

1. [ER Diagram](#er-diagram)
2. [Table: settings](#table-settings)
3. [Table: team_members](#table-team_members)
4. [Table: teams](#table-teams)
5. [Table: team_memberships](#table-team_memberships)
6. [Table: repositories](#table-repositories)
7. [Table: repository_teams](#table-repository_teams)
8. [Table: issues](#table-issues)
9. [Table: issue_assignees](#table-issue_assignees)
10. [Table: sync_jobs](#table-sync_jobs)
11. [Enums](#enums)
12. [Indexes](#indexes)

---

## ER Diagram

```
TeamMember  ──<  TeamMembership  >──  Team  ──<  RepositoryTeam  >──  Repository
     │                                                                    │
     ├── (IssueCreator) ──────────────>  Issue  <─────────────────────────┘
     │                                    │
     └──<  IssueAssignee  >───────────────┘
```

---

## Table: `settings`

Key-value configuration store. Used for workload thresholds and stale-issue settings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `key` | `String` | `@id` | Setting identifier (e.g. `workload_low_max`, `workload_medium_max`, `issue_stale_days`) |
| `value` | `String` | | Setting value (stored as string, parsed as integer) |
| `updatedAt` | `DateTime` | `@default(now()) @updatedAt` | Last update timestamp |

**Seed values:**

| key | value |
|-----|-------|
| `workload_low_max` | `3` |
| `workload_medium_max` | `7` |
| `issue_stale_days` | `30` |

---

## Table: `team_members`

All users of the application. Roles control access levels. Linked to GitHub/GitLab usernames for issue matching.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key (CUID) |
| `name` | `String` | | Display name |
| `username_github` | `String?` | `@unique` | GitHub username (used for SSO login + issue matching) |
| `username_gitlab` | `String?` | `@unique` | GitLab username (used for issue matching) |
| `role` | `Role` | `@default(UNASSIGNED)` | Access control role |
| `github_oauth_id` | `String?` | `@unique` | GitHub OAuth numeric user ID |
| `avatar_url` | `String?` | | Avatar URL from GitHub |
| `is_active` | `Boolean` | `@default(true)` | Soft-delete / offboard flag |
| `created_at` | `DateTime` | `@default(now())` | Record creation timestamp |
| `last_login_at` | `DateTime?` | | Last successful login timestamp |
| `kerjabaik_employee_id` | `String?` | `@unique` | External employee ID from Kerjabaik HR system |

**Relations:**
- `teams` → `TeamMembership[]` (many-to-many with `Team`)
- `createdIssues` → `Issue[]` (one-to-many, via `Issue.creatorTeamMemberId`)
- `assignedIssues` → `IssueAssignee[]` (one-to-many)

**Validation rules:**
- `username_github` must be unique across all members
- `username_gitlab` must be unique across all members
- `kerjabaik_employee_id` must be unique (when present)
- `role` must be one of: `ADMIN`, `MANAGER`, `DEVELOPER`, `UNASSIGNED`

---

## Table: `teams`

Named groups of members. Optionally linked to Kerjabaik projects for external sync.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `name` | `String` | `@unique` | Team display name |
| `kerjabaik_project_id` | `String?` | `@unique` | External project ID from Kerjabaik |
| `is_archived` | `Boolean` | `@default(false)` | Soft-delete flag |
| `created_at` | `DateTime` | `@default(now())` | Record creation timestamp |

**Relations:**
- `members` → `TeamMembership[]` (many-to-many with `TeamMember`)
- `repositories` → `RepositoryTeam[]` (many-to-many with `Repository`)

**Validation rules:**
- `name` must be unique (case-sensitive)
- `kerjabaik_project_id` must be unique (when present)

---

## Table: `team_memberships`

Many-to-many join between `TeamMember` and `Team`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `team_id` | `String` | Composite primary key | FK → `teams.id` |
| `team_member_id` | `String` | Composite primary key | FK → `team_members.id` |

**Relations:**
- `team` → `Team` (on delete: Cascade)
- `member` → `TeamMember` (on delete: Cascade)

**Primary key:** `(team_id, team_member_id)`

**Seed example:**
```json
{ "team_id": "clx...", "team_member_id": "clx..." }
```

---

## Table: `repositories`

Auto-discovered GitHub/GitLab repositories. Created during sync when issues reference a new repo.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `platform` | `Platform` | | `GITHUB` or `GITLAB` |
| `name` | `String` | | Repository name (e.g. `be-kerjabaik`) |
| `url` | `String` | `@unique` | Web URL of the repository |
| `platform_id` | `String?` | | Platform-specific repo ID (GitHub repo ID or GitLab project ID) |
| `ignored` | `Boolean` | `@default(false)` | When `true`, issues in this repo are excluded from all dashboards/reports |
| `discovered_at` | `DateTime` | `@default(now())` | When the repo was first discovered by sync |

**Relations:**
- `teams` → `RepositoryTeam[]` (many-to-many with `Team`)
- `issues` → `Issue[]` (one-to-many)

---

## Table: `repository_teams`

Many-to-many join between `Repository` and `Team`. Assigns repos to teams for scoped views.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `repository_id` | `String` | Composite primary key | FK → `repositories.id` |
| `team_id` | `String` | Composite primary key | FK → `teams.id` |

**Relations:**
- `repository` → `Repository` (on delete: Cascade)
- `team` → `Team` (on delete: Cascade)

**Primary key:** `(repository_id, team_id)`

---

## Table: `issues`

Issues/PRs pulled from GitHub and GitLab during sync.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `platform_id` | `String` | | Platform-specific issue number (GitHub: issue number; GitLab: IID) |
| `repository_id` | `String` | FK | FK → `repositories.id` |
| `title` | `String` | | Issue title |
| `url` | `String` | | Web URL to the issue |
| `state` | `IssueState` | | `OPEN` or `CLOSED` |
| `creator_username` | `String` | | Platform username of the issue creator |
| `creator_team_member_id` | `String?` | FK | FK → `team_members.id` (resolved during sync) |
| `created_at` | `DateTime` | | When the issue was created on the platform |
| `closed_at` | `DateTime?` | | When the issue was closed (null if open) |
| `synced_at` | `DateTime` | `@default(now()) @updatedAt` | When this record was last synced |

**Relations:**
- `repository` → `Repository` (on delete: Cascade)
- `creator` → `TeamMember?` (on delete: SetNull)
- `assignees` → `IssueAssignee[]`

**Unique constraint:** `(platform_id, repository_id)` — one row per platform-issue + repo pair.

---

## Table: `issue_assignees`

Join table linking issues to assignees (by platform username), later resolved to `TeamMember` IDs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `String` | `@id @default(cuid())` | Primary key |
| `issue_id` | `String` | FK | FK → `issues.id` |
| `platform_username` | `String` | | Username of the assignee on the platform (GitHub/GitLab) |
| `team_member_id` | `String?` | FK | FK → `team_members.id` (resolved during sync) |

**Relations:**
- `issue` → `Issue` (on delete: Cascade)
- `teamMember` → `TeamMember?` (on delete: SetNull)

**Unique constraint:** `(issue_id, platform_username)` — one row per issue-assignee pair.

---

## Table: `sync_jobs`

Tracks background sync runs and their summaries.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `String` | `@id` | Unique job ID |
| `status` | `String` | | `"running"`, `"done"`, or `"error"` |
| `started_at` | `DateTime` | `@default(now())` | Job start timestamp |
| `finished_at` | `DateTime?` | | Job end timestamp |
| `summary` | `Json?` | | JSON summary with member/issue counts |

---

## Enums

### Role
| Value | Description |
|-------|-------------|
| `SUPERADMIN` | Not stored in DB — determined by `SUPERADMIN_GITHUB_USERNAME` env var |
| `ADMIN` | Can manage members, teams, repos (cannot access Settings) |
| `MANAGER` | Can view all dashboards/reports, view any member profile |
| `DEVELOPER` | Can view dashboards/reports, only own member profile |
| `UNASSIGNED` | New users awaiting admin approval — confined to `/pending` |

### Platform
| Value | Description |
|-------|-------------|
| `GITHUB` | GitHub repository |
| `GITLAB` | GitLab repository |

### IssueState
| Value | Description |
|-------|-------------|
| `OPEN` | Issue is currently open |
| `CLOSED` | Issue has been closed |

---

## Indexes

| Table | Columns | Type | Purpose |
|-------|---------|------|---------|
| `issues` | `repository_id` | B-tree | Fast lookup by repo |
| `issues` | `creator_team_member_id` | B-tree | Fast lookup by creator |
| `issues` | `state` | B-tree | Filter by open/closed |
| `issues` | `created_at` | B-tree | Date range queries |
| `issues` | `closed_at` | B-tree | Closed-at date range queries |
| `issue_assignees` | `team_member_id` | B-tree | Fast lookup by assigned member |
| `issue_assignees` | `issue_id` | B-tree | Fast lookup by issue |

**Unique indexes** (implicit from model constraints):

| Table | Columns |
|-------|---------|
| `settings` | `key` |
| `team_members` | `username_github` |
| `team_members` | `username_gitlab` |
| `team_members` | `github_oauth_id` |
| `team_members` | `kerjabaik_employee_id` |
| `teams` | `name` |
| `teams` | `kerjabaik_project_id` |
| `team_memberships` | `(team_id, team_member_id)` |
| `repositories` | `url` |
| `repository_teams` | `(repository_id, team_id)` |
| `issues` | `(platform_id, repository_id)` |
| `issue_assignees` | `(issue_id, platform_username)` |

---

## Query Patterns

### Dashboard: Member workload
```sql
-- Count open issues per member (in non-ignored repos)
SELECT ia.team_member_id, COUNT(*)
FROM issue_assignees ia
JOIN issues i ON ia.issue_id = i.id
JOIN repositories r ON i.repository_id = r.id
WHERE i.state = 'OPEN' AND r.ignored = false
GROUP BY ia.team_member_id;
```

### Reports: Monthly stats per member
```sql
-- Issues created, assigned, resolved per member in a date range
SELECT tm.id,
  COUNT(DISTINCT i_created.id) AS issues_created,
  COUNT(DISTINCT ia.iid) AS issues_assigned,
  COUNT(DISTINCT i_closed.id) AS issues_resolved
FROM team_members tm
LEFT JOIN issues i_created ON tm.id = i_created.creator_team_member_id
  AND i_created.created_at BETWEEN :start AND :end
LEFT JOIN issue_assignees ia ON tm.id = ia.team_member_id
  AND ia.issue.created_at BETWEEN :start AND :end
LEFT JOIN issues i_closed ON i_closed.id = ia.issue_id
  AND i_closed.state = 'CLOSED' AND i_closed.closed_at BETWEEN :start AND :end
GROUP BY tm.id;
```

### Member profile: Issue timeline (heatmap)
```sql
-- Resolved issues by hour for the last N days
SELECT DATE_TRUNC('hour', closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta') AS bucket, COUNT(*)
FROM issues i
JOIN issue_assignees ia ON i.id = ia.issue_id
WHERE ia.team_member_id = :memberId
  AND i.state = 'CLOSED'
  AND i.closed_at >= :daysAgo
  AND i.repository_id IN (SELECT id FROM repositories WHERE ignored = false)
GROUP BY bucket
ORDER BY bucket;
```
