# Combined Team Monitor interface

The interface combines the two supplied AI Studio exports within the existing Next.js application.

- `internal-team-monitor (1).zip`: navy panels, capacity distribution, workload tiers, detailed member directory.
- `team-monitor---pemantauan-multi-tim (1).zip`: clear multi-team scope, bright workspace, blue accents, list/card views.

The final direction follows the user's preference for one mixed interface: a navy sidebar and capacity panel, white cards and tables, a pale blue page background, and royal blue actions. There is no light/dark selector. ThemeProvider forces light for retained components; dark surfaces are styled explicitly. Main colors are navy `#111B30`, blue `#4F6EF7`, and page `#F4F6FB`. Amber and coral distinguish medium and high workload.

Authentication, role guards, sync endpoints, reports, member profiles, and administration continue to use the original application. Mock databases, simulation controls, reset actions, and issue-editing flows from the exports have not been imported.

The dashboard uses full-scope summary metrics from `/api/dashboard`. Repository, platform, member status, name, team, and workload filters work with server pagination. Workload thresholds come from existing settings. Individual issue totals count unique issues; team rows show assignment counts and label multi-team overlap.

Check the implementation with `npm run typecheck`, `npm run build`, and `node scripts/dashboard-smoke.mjs`. The smoke check exercises the real route with isolated in-memory fixtures; it does not connect to or modify the database.

## Public design preview

`/preview` renders the same dashboard and navigation using clearly labelled, fictional browser-local fixtures. It does not call the dashboard, team, repository, sync, or member APIs. Search, team scope, workload filters, pagination, list/card views, and a sample member dialog work locally. Real workspace routes remain authenticated. Only the exact `/preview` path is public.

The login page offers a preview link and disables GitHub sign-in when OAuth credentials are missing or still placeholder values. Configure real OAuth credentials to enable normal login. Check fixture behavior with `node scripts/preview-smoke.mjs`.

The preview sidebar includes all six workspace and management destinations. Query-based routes (`/preview?section=reports`, `members`, `teams`, `repositories`, and `settings`) render sample screens, keep the active menu highlighted, and preserve the shared team scope. Reports export the visible sample workload snapshot as CSV; member and repository directories support searching; team cards open their dashboard scope; settings offer a local threshold simulation. These screens never mutate real records or settings.

## Interactive cards and readable type

Summary cards use native buttons with full click areas. Dashboard member/high-load cards focus the relevant directory; open/stale issue cards show scope-aware sample details in preview; capacity opens a category drilldown; team cards open the selected team's dashboard. Report cards open their member/assignment details, repository platform cards filter the table, and settings simulation cards drill into matching members or old issues. Native dialogs support keyboard focus, Escape, close controls, and backdrop dismissal. Member-profile statistic cards select the corresponding issue tab, including assigned and stale views.

Base text is 14px, key labels and member names are 14px, and supporting copy uses darker blue-gray for contrast. Cards provide hover/focus feedback and touch targets at least 44px tall. Narrow layouts stack insights, use two-column summary grids, and default the dashboard member directory to cards. Detail dialogs remain within the mobile viewport. Functional DOM checks cover the card actions, dialog handoffs, local filters, and computed text sizes/colors.
