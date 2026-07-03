# COMPONENT SPECS — Team Monitor

> Major components, their props, events, and responsibilities.

---

## Table of Contents

1. [Layout Components](#layout-components)
2. [Dashboard Components](#dashboard-components)
3. [Member Components](#member-components)
4. [Report Components](#report-components)
5. [Admin Components](#admin-components)
6. [UI Primitives](#ui-primitives)
7. [Shared Components](#shared-components)

---

## Layout Components

### Sidebar

**Path:** `src/components/Layouts/sidebar/index.tsx`  
**Type:** Client component  
**Library:** next-auth (`useSession`), next/navigation (`usePathname`)

**Props:** None

**State:**
- `expandedItems: string[]` — which menu items are expanded
- `syncing: boolean` — whether a sync is in progress
- `syncProgress: string | null` — current sync status text

**Renders:**
- Logo link to `/`
- Role-filtered navigation menu (NAV_DATA or NAV_DATA_DEVELOPER)
- Trigger Sync button with live SSE progress
- Last synced timestamp

**Sub-components used:**
- `MenuItem` (sidebar/menu-item.tsx)
- Sidebar icons (sidebar/icons.tsx)
- `Logo` (logo.tsx)

**Context consumed:**
- `useSidebarContext()` — open/close/mobile state

---

### MenuItem

**Path:** `src/components/Layouts/sidebar/menu-item.tsx`  
**Type:** Client component  
**Library:** class-variance-authority (`cva`), next/link

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `ReactNode` | Yes | Content to render inside |
| `isActive` | `boolean` | Yes | Whether the item is the current page |
| `className` | `string` | No | Additional CSS classes |
| `as` | `"link" \| "button"` | No | Render as Link or button (default: button) |
| `href` | `string` | When `as="link"` | Link destination |
| `onClick` | `() => void` | When `as="button"` | Click handler |

**Variants (cva):**
- Base: flex items, rounded, padding, transition
- Active: blue-50 background, primary text
- Inactive: gray-600 text, hover gray-100 background

---

### Header

**Path:** `src/components/Layouts/header/index.tsx`  
**Type:** Client component

**Props:** None

**Renders:**
- Mobile hamburger toggle (calls `toggleSidebar()`)
- Logo (mobile only)
- `ThemeToggleSwitch`
- `UserInfo`

---

### ThemeToggleSwitch

**Path:** `src/components/Layouts/header/theme-toggle/index.tsx`  
**Type:** Client component  
**Library:** next-themes (`useTheme`)

**Props:** None

**Behavior:**
- Calls `setTheme(theme === "dark" ? "light" : "dark")` on click
- Renders sun icon in dark mode, moon icon in light mode

---

### UserInfo

**Path:** `src/components/Layouts/header/user-info/index.tsx`  
**Type:** Client component  
**Library:** next-auth/react (`useSession`, `signOut`)

**Props:** None

**Renders:**
- Avatar + name + role badge (trigger)
- Dropdown: "My Profile" link → `/members/{session.user.id}`
- Dropdown: "Sign out" button → `signOut()`

---

### Notification

**Path:** `src/components/Layouts/header/notification/index.tsx`  
**Type:** Client component

**Props:** None

**Renders:** Bell icon with red dot, dropdown with hardcoded notification items.

**Note:** Currently uses static placeholder data. Not connected to any API.

---

### ShowcaseSection

**Path:** `src/components/Layouts/showcase-section.tsx`  
**Type:** Server component

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Card heading |
| `children` | `ReactNode` | Yes | Card content |
| `className` | `string` | No | Additional classes for content area |

**Renders:** Rounded card with border-bottom title bar.

---

## Dashboard Components

### DashboardClient

**Path:** `src/components/dashboard/DashboardClient.tsx`  
**Type:** Client component

**Props:** None

**State:**
| State | Type | Default | Description |
|-------|------|---------|-------------|
| `teamFilter` | `string` | `""` | Selected team ID |
| `platformFilter` | `"all" \| "github" \| "gitlab"` | `"all"` | Platform filter |
| `activeFilter` | `"active" \| "inactive" \| "all"` | `"active"` | Member active status |
| `nameFilter` | `string` | `""` | Name search text |
| `repoFilter` | `string` | `""` | Selected repo ID |
| `page` | `number` | `1` | Current page |
| `sortCol` | `string` | `"name"` | Sort column |
| `sortDir` | `"asc" \| "desc"` | `"asc"` | Sort direction |
| `data` | `{ total, data[] }` | — | API response |
| `teams` | `Team[]` | — | Team list for dropdown |
| `repos` | `Repository[]` | — | Repo list for dropdown |
| `loading` | `boolean` | `true` | Loading state |

**Renders:**
- 3 summary cards: Members count, Total Open Issues, High Workload count
- Filter bar with 5 controls (team, repo, platform, active, name)
- Sortable table: Member (avatar + link), Role badge, Teams, Open Issues, Workload badge
- Pagination (via `Pagination` component)

**Color coding:**
- `workloadLevel === "low"` → green badge
- `workloadLevel === "medium"` → yellow badge
- `workloadLevel === "high"` → red badge

---

## Member Components

### MemberProfileClient

**Path:** `src/components/members/MemberProfileClient.tsx`  
**Type:** Client component

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `memberId` | `string` | Yes | Member UUID |

**State:**
| State | Type | Default | Description |
|-------|------|---------|-------------|
| `platform` | `"all" \| "github" \| "gitlab"` | `"all"` | Platform filter |
| `days` | `0 \| 30 \| 90 \| 180` | `0` | Time window (0 = all time) |
| `issuesPage` | `number` | `1` | Issue list page |

**Renders:**
- Profile header: avatar, name, role, GitHub/GitLab usernames, teams, last login
- Stats cards: Open Issues, Created, Assigned, Resolved, Stale (orange highlight if > 0)
- `ActivityChart` — heatmap of resolved issues by hour
- Repository activity table
- Issue list with tabs (All/Open/Resolved/Created), pagination, stale badges

---

### ActivityChart

**Path:** `src/components/members/ActivityChart.tsx`  
**Type:** Client component  
**Library:** ApexCharts (dynamically imported, SSR disabled)

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `records` | `HeatmapRecord[]` | Yes | `{ date: string, hour: number, count: number }[]` |
| `days` | `number` | Yes | Number of days to display |

**Renders:** Heatmap grid — dates on X-axis, 3-hour time buckets on Y-axis, green color scale (GitHub-style). Anchored to WIB "today".

---

## Report Components

### ReportsClient

**Path:** `src/components/reports/ReportsClient.tsx`  
**Type:** Client component

**Props:** None

**State:**
| State | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | `"monthly" \| "custom"` | `"monthly"` | Date range mode |
| `month` | `string` | current | Month as `YYYY-MM` |
| `startDate` | `string` | — | Custom range start |
| `endDate` | `string` | — | Custom range end |
| `name` | `string` | `""` | Name filter |
| `repoId` | `string` | `""` | Repository filter |
| `platform` | `string` | `"all"` | Platform filter |
| `viewMode` | `"member" \| "team"` | `"member"` | View mode |
| `page` | `number` | `1` | Current page |
| `sort` | `string` | `"issuesResolved"` | Sort column |
| `sortDir` | `"asc" \| "desc"` | `"desc"` | Sort direction |

**Renders:**
- Export CSV button
- Mode toggle (Monthly / Custom Range)
- Filter bar (name, repo, platform, view mode)
- By Member: sortable table with totals footer row
- By Team: expandable grouped view by team

---

## Admin Components

### AdminMembersClient

**Path:** `src/components/admin/members/AdminMembersClient.tsx`  
**Type:** Client component

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `kerjabaikEnabled` | `boolean` | `false` | Whether Kerjabaik manages members |
| `kerjabaikBaseUrl` | `string` | `""` | Kerjabaik base URL for links |

**Renders:**
- "Add Member" button (hidden when `kerjabaikEnabled`)
- Status filter pills (All / Active / Inactive)
- Member table: avatar + name, status, role, usernames, teams, last login, actions
- Actions: Edit, Activate/Deactivate, Delete (with confirmation modal)
- UNASSIGNED members highlighted yellow

---

### MemberForm

**Path:** `src/components/admin/members/MemberForm.tsx`  
**Type:** Client component

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `memberId` | `string` | No | If set, edit mode; otherwise create mode |

**Fields:**
- Display Name (`name`) — required
- GitHub Username (`usernameGithub`) — optional
- GitLab Username (`usernameGitlab`) — optional
- Role dropdown — ADMIN, MANAGER, DEVELOPER, UNASSIGNED
- Active toggle — edit mode only
- Teams — multi-select pills, toggled on/off

**Behavior:**
- Create mode: `POST /api/members` → navigate to `/admin/members`
- Edit mode: loads existing data, `PATCH /api/members/:id`
- Team changes: computes diff and calls `POST/DELETE /api/teams/:id/members`

---

### AdminTeamsClient

**Path:** `src/components/admin/teams/AdminTeamsClient.tsx`  
**Type:** Client component

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `kerjabaikEnabled` | `boolean` | `false` | Whether Kerjabaik manages teams |
| `kerjabaikBaseUrl` | `string` | `""` | Kerjabaik base URL |

**Renders:**
- Left panel: Create input, team list with rename/delete, pagination
- Right panel: Selected team's member list, add member dropdown (available non-members), remove buttons
- Delete confirmation modal
- Kerjabaik mode: read-only banner

---

### AdminReposClient

**Path:** `src/components/admin/repositories/AdminReposClient.tsx`  
**Type:** Client component

**Props:** None

**Renders:**
- Platform filter (All / GitHub / GitLab)
- Ignored status filter (Active only / All / Ignored only)
- Repository table: Platform badge, Name (link), Ignored badge, Ignore/Unignore toggle
- Ignored repos shown with reduced opacity

---

### SettingsClient

**Path:** `src/components/admin/settings/SettingsClient.tsx`  
**Type:** Client component

**Props:** None

**Renders:**
- Stale Issue Threshold card (number input)
- Workload Thresholds card (lowMax, mediumMax number inputs + derived high band)
- Live preview table showing workload classifications for counts 0–20
- Save button with "Saved" confirmation
- Error display on validation failure

**Validation:** `lowMax < mediumMax`, all positive integers.

---

## UI Primitives

### Skeleton

**Path:** `src/components/ui/skeleton.tsx`  
**Type:** Generic

**Props:** `HTMLAttributes<HTMLDivElement>` + `className`

**Renders:** Animated pulse placeholder div with `bg-gray-200 dark:bg-gray-700 rounded-md`.

---

### Table

**Path:** `src/components/ui/table.tsx`  
**Type:** Generic

**Exports:** `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`

**Props:** Standard HTML table element attributes + `className`.

**Note:** Defined but most pages use inlined `<table>` elements instead.

---

### Dropdown

**Path:** `src/components/ui/dropdown.tsx`  
**Type:** Client component (context-based)

**Exports:**
- `Dropdown` — provider with open/close state, escape key, outside click
- `DropdownTrigger` — toggle button
- `DropdownContent` — positioned content (`align`: `"start"` | `"end"` | `"center"`)
- `DropdownClose` — wrapper that closes on child click

**Props (Dropdown):**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `ReactNode` | Yes | Content |
| `isOpen` | `boolean` | Yes | Open state |
| `setIsOpen` | `(open: boolean) => void` | Yes | Setter |

---

### Pagination

**Path:** `src/components/ui/pagination.tsx`  
**Type:** Generic

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `page` | `number` | Yes | Current page (1-indexed) |
| `totalItems` | `number` | Yes | Total items across all pages |
| `pageSize` | `number` | Yes | Items per page |
| `onPageChange` | `(page: number) => void` | Yes | Page change callback |
| `className` | `string` | No | Additional CSS |

**Renders:** "N–M of Total" label, Previous/Next buttons, numbered page buttons with ellipsis.

---

## Shared Components

### Logo

**Path:** `src/components/logo.tsx`  
**Type:** Server component

**Props:** None

**Renders:** Blue rounded square with "TM" monogram + "Team Monitor" text.

### PeriodPicker

**Path:** `src/components/period-picker.tsx`  
**Type:** Stub

**Renders:** `null`. Not used in the current application.
