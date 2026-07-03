# PRD: Multi-Team Monitoring Enhancement

**Status:** Draft  
**Date:** 2026-07-03  
**Author:** [Your Name]

---

## 1. Context & Problem Statement

### The Scenario

Kedata is a **managed service company** running 3 engineering teams for different clients (Team A, Team B, Team C). Each client team has its own set of repositories. Many Kedata employees work across multiple client teams — a PM might oversee all 3, a QA might test for Team A and Team B, a DevOps engineer might manage infra for all teams.

**Cross-team roles include:** PM, QA, FE Developer, BE Developer, DevOps, Fullstack Engineer. These are job functions (what someone does), not access roles (what someone can see).

### Current Limitation

Team Monitor currently shows **one global view**. Every manager and developer sees the same dashboard with all members and all issues from all repos mixed together. There's no way to say "show me only Team A's workload" or "how many open issues does Team B have?"

The data model already has `Team`, `TeamMembership`, and `RepositoryTeam`, but they're unused at the query/UI layer:

- `RepositoryTeam` has no UI — repos can't be tagged to teams.
- Reports has no team filter at all.
- The Dashboard's `repoTeamId` API parameter is never sent from the UI.
- The session has no concept of "which teams do I belong to."

---

## 2. Goals

### Primary

1. **Repository → Team assignment** — Admins tag each repo to one or more teams. This is the foundation: without it, there's no way to scope issues.
2. **Team-scoped views** — When you select "Team A" in the sidebar, the dashboard and reports show **only Team A's members, repos, and issues**.
3. **Cross-team support** — A member in 2 teams sees **all** their teams in a sidebar switcher. Switching recalculates everything in that team's context.
4. **Job function (job role)** — Each member has a job role (PM, QA, FE Dev, BE Dev, DevOps, Fullstack) for filtering within a team view.
5. **Team overview page** — A new page showing one team at a glance: members by job role, repo health, open/closed issues, stale count.

### Secondary

6. **Team-level reports** — Monthly reports scoped to a team, not global.
7. **Shared repo handling** — A DevOps repo used by all 3 teams should be taggable to all 3.
8. **Workload calculated per-team** — A cross-team member's workload in Team A only counts Team A's repo issues.

---

## 3. Non-Goals

- Team-level workload thresholds (global thresholds are fine for MVP).
- Per-team sync schedules.
- Client-facing dashboards (only internal Kedata users).
- Changing the sync engine (syncs all repos globally; scoping happens at query time).

---

## 4. Data Model Changes

### 4.1 New Field: `TeamMember.jobRole`

Add a `jobRole` string field to `TeamMember` to capture job function.

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `job_role` | `String?` | `PM`, `QA`, `FE_DEV`, `BE_DEV`, `DEVOPS`, `FULLSTACK`, `null` | What the person actually does. Distinct from `role` (access control). |

**Why separate from `role`?** `role` controls access (who can see admin pages). `jobRole` is metadata for filtering and display. A PM might have the app role `MANAGER` (can see dashboards) while their job function is `PM`.

### 4.2 Existing Models (No Changes)

The current schema already supports everything else:

```
TeamMember ──< TeamMembership >── Team ──< RepositoryTeam >── Repository
                                                     │
                                                     ▼
                                                   Issue
```

- `TeamMembership` → cross-team members (one person, multiple teams). ✓
- `RepositoryTeam` → repos assigned to teams (many-to-many). ✓
- `Team.isArchived` → soft-delete teams. ✓

**Migration needed:** One new nullable column on `team_members`.

---

## 5. Detailed Feature Specs

### 5.1 Repository → Team Assignment (Admin UI)

**Where:** `Admin > Repositories` page.

**Current state:** Table shows Platform, Name, Ignored status. No team column.

**New behavior:**
- Add a **Teams** column showing pill badges for each team the repo belongs to.
- Click a repo row → opens an inline multi-select dropdown of all active teams.
- Check/uncheck teams → saves immediately via `PATCH /api/repositories/:id` with `{ teamIds: [...] }`.
- Shared repos (e.g., DevOps infra) can be tagged to multiple teams.
- Untagged repos show a warning badge "No team — excluded from all team views."

**API:** Already exists — `PATCH /api/repositories/:id` accepts `teamIds`. Just needs UI wiring.

---

### 5.2 Job Role Field

**Where:** `Admin > Members > Add/Edit Member` form.

**New field:** Job Role dropdown — PM, QA, FE Developer, BE Developer, DevOps, Fullstack, (none).

**Display:**
- Dashboard table: show job role badge next to name/avatar.
- Member profile header: show job role.
- Team overview: group members by job role.

**API:** Add `jobRole` to member create/update payloads. Return in member list/profile responses.

---

### 5.3 Team Switcher (Sidebar)

**Where:** Top of sidebar, below logo, above nav menu.

**Appearance:** A dropdown showing the current team name with a team icon. Clicking opens a list:

```
┌──────────────────────────┐
│  Team A          ▼       │
├──────────────────────────┤
│  ○ Team A                │
│  ○ Team B                │
│  ○ Team C                │
├──────────────────────────┤
│  ○ All Teams (admin)     │
└──────────────────────────┘
```

**Logic:**

| User's Teams | Options Shown | Default |
|---|---|---|
| 1 team | That team only (no dropdown, just a label) | That team |
| 2+ teams | Each team + "All My Teams" | "All My Teams" |
| Admin/Superadmin | Each team + "All Teams" | "All Teams" |

**Cross-team behavior:** A PM who belongs to Team A and Team B sees both in the switcher. Selecting "Team A" scopes everything to Team A. Selecting "Team B" scopes to Team B. "All My Teams" shows combined data from all their teams.

**Persistence:** Store the selected team ID in a cookie (`active_team_id`) so it survives page refreshes and browser restarts.

**URL override:** Allow `?team=xxx` query param for shareable links (takes precedence over cookie).

---

### 5.4 Dashboard — Team-Scoped

**When a team is selected (e.g., "Team A"):**

1. **Members shown:** Only members of Team A.
2. **Issues counted:** Only issues in repos tagged to Team A.
3. **Workload calculation:** A cross-team member's `currentLoad` reflects only Team A's repos.

**Summary cards:**
| Card | Content |
|------|---------|
| Members | Count of Team A members |
| Open Issues | Total open issues across Team A's repos |
| High Workload | Members with `currentLoad > mediumMax` within Team A's scope |

**Table columns (updated):**
| Column | Content |
|--------|---------|
| Member | Avatar + name (linked to profile) + job role badge |
| Role | App role (ADMIN/MANAGER/DEVELOPER) |
| Job Role | PM, QA, FE Dev, etc. |
| Open Issues | Issues in selected team's repos |
| Workload | Color-coded badge based on team-scoped count |
| Other Teams | Mini badges showing other teams this person belongs to (for cross-team awareness) |

**When "All My Teams" is selected:** Combine all teams the user belongs to. Works the same as current global view but limited to their teams.

**When "All Teams" is selected (admin only):** Current global view behavior preserved.

**API changes:**
- `GET /api/dashboard` already supports `teamId` and `repoTeamId`. No new params needed.
- Add server-side auto-scoping: when `teamId` is set, automatically set `repoTeamId` to the same value (so both members AND repos are filtered to that team).

---

### 5.5 Team Overview Page (New)

**Route:** `/teams/[id]`  
**Access:** All authenticated users (scoped to their teams).

This is a **team-level landing page** that replaces the need to go to Dashboard and manually filter. Think of it as "Dashboard, but pre-filtered to one team, with richer detail."

**Sections:**

**Header:**
- Team name, member count, repo count.
- Quick stats: total open issues, closed this month, stale issues.

**Members by Job Role:**
```
┌─ PM (2) ─────────────────────────────────────┐
│  Alice (3 open)  Bob (1 open)                 │
└───────────────────────────────────────────────┘
┌─ BE Dev (4) ──────────────────────────────────┐
│  Charlie (5 open)  Dave (2 open)  Eve (0) ... │
└───────────────────────────────────────────────┘
┌─ FE Dev (3) ──────────────────────────────────┐
│  ...                                          │
└───────────────────────────────────────────────┘
```
Each member is a card/chip showing avatar, name, open issue count, and workload color. Clicking navigates to their profile.

**Repositories:**
- List of repos tagged to this team, with open/closed issue counts per repo.
- Link to the repo on GitHub/GitLab.
- Stale issue count per repo.

**Recent Activity:**
- Last 5 closed issues across the team's repos (who closed, what, when).

---

### 5.6 Reports — Team-Scoped

**When a team is selected via the sidebar switcher:**

- **By Member view:** Shows only members of the selected team. Issues counted only from that team's repos.
- **By Team view:** If a single team is selected, show that team's data expanded. If "All My Teams" is selected, show all the user's teams grouped.
- **CSV Export:** Scoped to the active team.

**New UI:** Add a Team dropdown to the Reports page (mirrors Dashboard). Respects the sidebar team switcher as the default.

**API changes:**
- `GET /api/reports/monthly` — add `teamId` query param (currently missing).
- `GET /api/reports/export` — add `teamId` query param.

---

### 5.7 Member Profile — Cross-Team Context

**When viewing a member who belongs to multiple teams:**

- **Profile header:** Show all teams as badges. The **active team** (from sidebar switcher) is highlighted.
- **Stats and issues:** Scoped to the active team by default. The Platform/Time filters already work; add a **Team filter** dropdown so you can toggle between "Team A", "Team B", or "All My Teams".
- **Repository table:** Shows only repos belonging to the active team.

**Access control:** A non-admin user can only view profiles of members who share at least one team with them.

---

### 5.8 Shared Repository Handling

Some repos are shared across teams (e.g., a DevOps infra repo used by all 3 teams). These repos should be tagged to all applicable teams in the admin UI.

**When a repo belongs to multiple teams:**
- Issues from that repo appear in **every team's** dashboard and reports.
- A cross-team member assigned to an issue in a shared repo will see it counted in whichever team they're currently viewing.
- This is correct behavior: if DevOps repo issues are relevant to Team A and Team B, both teams should see them.

**Admin hint:** Show a "(shared)" badge on repos tagged to 2+ teams in the admin repositories page.

---

## 6. UI Changes Summary

| Component | Change |
|---|---|
| **Sidebar** | Add Team Switcher dropdown (below logo, above nav). Shows teams the user belongs to. |
| **Dashboard** | Team-scoped by default. Add Job Role column. Show "Other Teams" badges on cross-team members. |
| **Team Overview** (NEW) | `/teams/[id]` — team landing page with members grouped by job role, repo list, recent activity. |
| **Reports** | Add Team dropdown. Scope data to active team. |
| **Member Profile** | Add Team filter for stats/issues. Highlight active team. Cross-team access guard. |
| **Admin Repositories** | Add Teams column with multi-select assignment. Show "(shared)" badge. |
| **Admin Members** | Add Job Role field to create/edit form. Show job role in member table. |

---

## 7. API Changes Summary

| Route | Change |
|---|---|
| `GET /api/dashboard` | Auto-set `repoTeamId = teamId` when `teamId` is provided. Return `jobRole`. Return `otherTeamIds` for cross-team members. |
| `GET /api/reports/monthly` | Add `teamId` query param. Scope members + repos to team. |
| `GET /api/reports/export` | Add `teamId` query param. |
| `POST /api/members` | Accept `jobRole` field. |
| `PATCH /api/members/:id` | Accept `jobRole` field. |
| `GET /api/members/:id` | Return `jobRole`. Return `otherTeams` (teams the member belongs to besides the active one). |
| `GET /api/members/:id/stats` | Add `teamId` param to scope issue counts to team repos. |
| `GET /api/members/:id/issues` | Add `teamId` param to scope to team repos. |
| `GET /api/members/:id/timeline` | Add `teamId` param. |
| `GET /api/members/:id/repositories` | Add `teamId` param. |
| `GET /api/teams/:id/overview` | **New** — team overview data (members grouped by job role, repos, recent activity). |
| `PATCH /api/repositories/:id` | Already supports `teamIds` — just needs UI wiring. |

---

## 8. Database Migration

```sql
ALTER TABLE team_members 
ADD COLUMN job_role VARCHAR(20);
```

**Enum values:** `PM`, `QA`, `FE_DEV`, `BE_DEV`, `DEVOPS`, `FULLSTACK` (nullable).

---

## 9. Access Matrix (Updated)

| App Role | Can See | Admin Access | Settings |
|---|---|---|---|
| **Superadmin** | All teams | Full | Yes |
| **Admin** | All teams | Full | No |
| **Manager** | Teams they belong to | None | No |
| **Developer** | Teams they belong to | None | No |

**Cross-team note:** A Manager who belongs to Team A and Team B can switch between them in the sidebar and see each team's data. They cannot see Team C. The sidebar only shows teams they belong to.

---

## 10. Implementation Phases

### Phase 1: DB + Job Role (0.5 day)
- Add `job_role` column migration.
- Add Job Role field to member create/edit form.
- Display job role in dashboard table and member profile.

### Phase 2: Repository → Team Assignment (1-2 days)
- Add Teams column + multi-select to admin repositories page.
- Wire up existing `PATCH /api/repositories/:id` with `teamIds`.
- Add "(shared)" badge for multi-team repos.
- Add "No team" warning for untagged repos.

### Phase 3: Team Context in Session (0.5 day)
- Add `teamIds` to JWT and session.
- Add `teamNames` for display.

### Phase 4: Sidebar Team Switcher (1-2 days)
- Build TeamSwitcher component.
- Cookie persistence (`active_team_id`).
- URL override (`?team=xxx`).
- Wire team selection to dashboard/reports refetch.

### Phase 5: Dashboard & Reports Scoping (2-3 days)
- Auto-scope `repoTeamId = teamId` in dashboard API.
- Add `teamId` param to reports API.
- Add team-scoped querying to member profile endpoints.
- Add "Other Teams" badges to dashboard table.

### Phase 6: Team Overview Page (1-2 days)
- New route: `/teams/[id]`.
- New API: `GET /api/teams/:id/overview`.
- Members grouped by job role with workload indicators.
- Repo list with open/closed counts.
- Recent closed issues.

### Phase 7: Polish & Edge Cases (1-2 days)
- Members with no team → show guidance message.
- Teams with no repos → show "No repositories assigned" state.
- Repos with no team → excluded from all team-scoped views.
- Cross-team member profile: team filter dropdown for stats/issues.
- Handle team archival (exclude from switcher, keep data accessible to admins).
- Shared repo duplicate counting: verify an issue in a shared repo isn't double-counted on "All My Teams" view.

---

## 11. Open Questions

1. **Job role enum vs free text?** Recommend enum for now (PM, QA, FE_DEV, BE_DEV, DEVOPS, FULLSTACK) since the set is small and stable. Can migrate to free text later.

2. **Should "All My Teams" combine or separate?** For a cross-team PM viewing "All My Teams", should issue counts be deduplicated? **Yes** — an issue in a shared DevOps repo tagged to both Team A and Team B should count once, not twice.

3. **What if a repo has NO team?** Should those issues appear anywhere? **No** — untagged repos and their issues are excluded from all team-scoped views. They only appear in "All Teams" (admin) view. The admin repos page should warn about untagged repos.

4. **Should the Team Overview page replace the Dashboard for non-admin users?** Optionally — the Dashboard with "All My Teams" is still useful for a high-level view. Team Overview is for deep-diving into one team.

5. **What happens when a member is added to/removed from a team?** The JWT `teamIds` will be stale until the next session refresh. Use `trigger("update")` in next-auth when team membership changes (or accept a brief delay).

---

## 12. Success Metrics

- A PM selects "Team A" in the sidebar → dashboard shows only Team A's members, only Team A's repos' issues.
- A DevOps engineer tagged to 3 teams sees all 3 in the switcher and can toggle between them.
- A repo tagged to Team A and Team B appears in both team overviews. An issue assigned to a cross-team member is counted in whichever team context is active.
- Admin can tag/untag repos to teams from the admin UI.
- A member with job role "BE Dev" is grouped under BE Dev in the team overview page.
