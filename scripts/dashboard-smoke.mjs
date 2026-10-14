import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { build } from "esbuild";

const require = createRequire(import.meta.url);
const members = Array.from({ length: 13 }, (_, i) => ({
  id: `m${i}`,
  name: `Member ${String(i).padStart(2, "0")}`,
  role: "DEVELOPER",
  avatarUrl: null,
  isActive: i < 12,
  teams: [{ team: { id: i % 2 ? "b" : "a", name: i % 2 ? "Beta" : "Alpha" } }],
}));
const issues = Array.from({ length: 12 }, (_, i) => ({
  id: `i${i}`,
  title: `Issue ${i}`,
  url: `https://github.com/team/project/issues/${i + 1}`,
  state: "OPEN",
  memberIds: i < 2 ? ["m0", "m1"] : ["m0"],
  repository: { id: "r1", platform: "GITHUB", ignored: false },
  createdAt: new Date(Date.now() - (i < 3 ? 40 : 2) * 86400000),
}));
issues.push(...[1, 6, 8, -1].map((days, i) => ({
  id: `closed${i}`,
  title: `Completed ${i}`,
  url: `https://github.com/team/project/issues/${20 + i}`,
  state: "CLOSED",
  memberIds: i === 0 ? ["m0", "m1"] : ["m0"],
  repository: { id: "r1", name: "team/project", platform: "GITHUB", ignored: false },
  createdAt: new Date(Date.now() - 45 * 86400000),
  closedAt: new Date(Date.now() - days * 86400000),
})));
let session = { user: { role: "MANAGER", isSuperadmin: false } };
const matchIssue = (issue, where) => {
  const repo = where.repository;
  return (
    (typeof where.state === 'string' ? issue.state === where.state : where.state.in.includes(issue.state)) &&
    !issue.repository.ignored &&
    (!repo.id || issue.repository.id === repo.id) &&
    (!repo.platform || issue.repository.platform === repo.platform) &&
    issue.memberIds.some((id) =>
      where.assignees.some.teamMemberId.in.includes(id),
    ) &&
    (!where.createdAt || issue.createdAt < where.createdAt.lt) &&
    (!where.closedAt || (issue.closedAt >= where.closedAt.gte && issue.closedAt <= where.closedAt.lte)) &&
    (!where.OR || where.OR.some((condition) => Object.entries(condition).every(([field, range]) => issue[field] && issue[field] >= range.gte && issue[field] <= range.lte)))
  );
};
globalThis.__dashboardSmoke = {
  auth: async () => session,
  thresholds: { lowMax: 3, mediumMax: 7, staleDays: 30 },
  prisma: {
    teamMember: {
      findMany: async ({ where }) =>
        members.filter(
          (m) =>
            (!where.teams ||
              m.teams.some((t) => t.team.id === where.teams.some.teamId)) &&
            (where.isActive === undefined || m.isActive === where.isActive) &&
            (!where.name ||
              m.name.toLowerCase().includes(where.name.contains.toLowerCase())),
        ),
    },
    issueAssignee: {
      groupBy: async ({ where }) =>
        members
          .filter((m) => where.teamMemberId.in.includes(m.id))
          .map((m) => ({
            teamMemberId: m.id,
            _count: {
              issueId: issues.filter(
                (issue) =>
                  issue.state === where.issue.state && issue.memberIds.includes(m.id) &&
                  (!where.issue.repository.id ||
                    issue.repository.id === where.issue.repository.id) &&
                  (!where.issue.repository.platform ||
                    issue.repository.platform ===
                      where.issue.repository.platform),
              ).length,
            },
          })),
    },
    issue: {
      count: async ({ where }) =>
        issues.filter((issue) => matchIssue(issue, where)).length,
      findMany: async ({ where, skip = 0, take }) =>
        issues.filter((issue) => matchIssue(issue, where))
          .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
          .slice(skip, take === undefined ? undefined : skip + take)
          .map((issue) => ({
            ...issue,
            closedAt: issue.closedAt ?? null,
            repository: { ...issue.repository, name: "team/project" },
            assignees: issue.memberIds.map((id) => ({ teamMember: members.find((member) => member.id === id) || null })),
          })),
    },
  },
};
const result = await build({
  entryPoints: ["src/app/api/dashboard/route.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  packages: "external",
  plugins: [
    {
      name: "dashboard-fixtures",
      setup(builder) {
        builder.onResolve(
          { filter: /^@\/lib\/(auth|prisma|settings|session)$/ },
          ({ path }) => ({ path, namespace: "fixture" }),
        );
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
          contents: {
            "@/lib/auth":
              "export const auth = globalThis.__dashboardSmoke.auth;",
            "@/lib/prisma":
              "export const prisma = globalThis.__dashboardSmoke.prisma;",
            "@/lib/session":
              'export const isAdminRole = (s) => s.user.isSuperadmin || s.user.role === "ADMIN";',
            "@/lib/settings":
              'export const getWorkloadThresholds = async () => globalThis.__dashboardSmoke.thresholds; export const getWorkloadLevel = (n,t) => n <= t.lowMax ? "low" : n <= t.mediumMax ? "medium" : "high";',
          }[path],
          loader: "js",
        }));
      },
    },
  ],
});
const module = { exports: {} };
new Function("require", "module", "exports", result.outputFiles[0].text)(
  require,
  module,
  module.exports,
);
const get = async (query = "") => {
  const response = await module.exports.GET({
    nextUrl: new URL(`http://localhost/api/dashboard?${query}`),
  });
  return { status: response.status, body: await response.json() };
};
const first = (await get("page=1&limit=10&sortCol=currentLoad&sortDir=desc"))
  .body;
const second = (await get("page=2&limit=10&sortCol=currentLoad&sortDir=desc"))
  .body;
assert.equal(first.data.length, 10);
assert.equal(second.data.length, 3);
assert.equal(first.total, 13);
assert.deepEqual(
  first.summary,
  second.summary,
  "Summary must not depend on the current page",
);
assert.equal(
  first.summary.totalOpenIssues,
  12,
  "Count unique issues, not duplicate assignments",
);
assert.equal(first.summary.staleIssues, 3);
assert.equal(first.summary.resolvedLast7Days, 2, "Use recent closure times, exclude future/old closures and deduplicate assignments");
assert.equal(first.attentionIssues.length, 3);
assert.equal(first.attentionIssues[0].ageDays, 40);
assert.deepEqual(first.attentionIssues[0].assignees.map((member) => member.memberId), ["m0", "m1"]);
assert.deepEqual(first.attentionIssues, second.attentionIssues, "Attention list must not depend on the directory page");
assert.equal(first.summary.highWorkload, 1);
assert.equal(first.trends.weeks.length, 4);
assert.equal(first.trends.weeks[3].created, 9);
assert.equal(first.trends.weeks[3].resolved, 2);
assert.equal(first.trends.resolvedDelta, 1);
assert.deepEqual(first.trends.weeks.map(({ created, resolved }) => ({ created, resolved })), second.trends.weeks.map(({ created, resolved }) => ({ created, resolved })));
assert.equal(first.summary.activeMembers, 12);
assert.deepEqual(first.summary.distribution, { low: 12, medium: 0, high: 1 });
assert.equal(first.data[0].currentLoad, 12);
assert.equal((await get("workload=high")).body.total, 1);
assert.equal(
  (await get("workload=high")).body.summary.memberCount,
  13,
  "Capacity overview retains the scope when a tier is selected",
);
assert.equal((await get("teamId=b")).body.total, 6);
assert.equal((await get("teamId=b")).body.summary.totalOpenIssues, 2);
assert.equal((await get("teamId=b")).body.summary.resolvedLast7Days, 1);
assert.ok((await get("teamId=b")).body.attentionIssues.every((issue) => issue.assignees.every((member) => member.memberId === "m1")), "Only expose assignees in the current scope");
assert.equal((await get("active=true")).body.total, 12);
assert.equal((await get("platform=gitlab")).body.summary.totalOpenIssues, 0);
assert.equal((await get("platform=gitlab")).body.summary.resolvedLast7Days, 0);
assert.equal((await get("platform=gitlab")).body.attentionIssues.length, 0);
assert.equal(
  (await get("repositoryId=missing")).body.summary.totalOpenIssues,
  0,
);
assert.equal((await get("name=Member%2000")).body.total, 1);
assert.equal((await get("name=missing")).body.summary.memberCount, 0);
assert.equal((await get("name=missing")).body.summary.resolvedLast7Days, 0);
const staleDetails = (await get("issueView=stale&issueLimit=2")).body;
assert.equal(staleDetails.total, 3);
assert.equal(staleDetails.data.length, 2);
assert.ok(staleDetails.data.every((issue) => issue.ageDays > 30 && issue.url.startsWith("https://github.com/")));
assert.equal((await get("issueView=stale&issueLimit=2&issuePage=2")).body.data.length, 1);
assert.equal((await get("issueView=open&issueLimit=5")).body.total, 12);
assert.equal((await get("issueView=stale&teamId=b")).body.total, 2);
assert.equal((await get("issueView=stale&repositoryId=missing")).body.total, 0);
assert.equal((await get("issueView=stale&platform=gitlab")).body.total, 0);
assert.equal((await get("issueView=stale&name=missing")).body.total, 0);
assert.equal((await get("issueView=open&issuePage=Infinity&issueLimit=Infinity")).body.page, 1);
assert.equal((await get("issueView=open&issuePage=-2&issueLimit=1000")).body.limit, 100);
globalThis.__dashboardSmoke.thresholds.staleDays = 50;
assert.equal((await get()).body.summary.staleIssues, 0);
assert.equal((await get()).body.attentionIssues.length, 0);
assert.equal((await get("issueView=stale")).body.total, 0, "Details and summary follow the configured age threshold");
globalThis.__dashboardSmoke.thresholds.staleDays = 1;
assert.equal((await get()).body.summary.staleIssues, 12);
assert.equal((await get("issueView=stale")).body.total, 12);
globalThis.__dashboardSmoke.thresholds.staleDays = 30;
assert.equal(
  (await get("page=invalid&limit=invalid&sortCol=invalid")).body.data.length,
  10,
);
assert.equal((await get("page=Infinity&limit=Infinity")).body.data.length, 10);
session = null;
assert.equal((await get()).status, 401);
assert.equal((await get("issueView=stale")).status, 401);
session = { user: { role: "UNASSIGNED", isSuperadmin: false } };
assert.equal((await get()).status, 403);
assert.equal((await get("issueView=stale")).status, 403);
console.log(
  "Dashboard smoke checks passed: pagination, unique totals, workload tiers, team/platform/repository/search filters, empty results, and access control.",
);
