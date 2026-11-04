import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { build } from "esbuild";
const require = createRequire(import.meta.url);
const daysAgo = (days) => new Date(Date.now() - days * 86400000);
const fixtures = [
  { id: "stale", state: "OPEN", createdAt: daysAgo(45), closedAt: null },
  { id: "fresh", state: "OPEN", createdAt: daysAgo(2), closedAt: null },
  {
    id: "resolved-recently",
    state: "CLOSED",
    createdAt: daysAgo(60),
    closedAt: daysAgo(2),
  },
  {
    id: "resolved-long-ago",
    state: "CLOSED",
    createdAt: daysAgo(60),
    closedAt: daysAgo(45),
  },
].map((issue) => ({
  ...issue,
  title: issue.id,
  url: "https://example.com/issue",
  creatorTeamMemberId: "member",
  repository: { id: "repo", name: "repo", platform: "GITHUB", ignored: false },
  assignees: [{ teamMemberId: "member" }],
}));
const matches = (issue, where) =>
  (!where.id || where.id.in.includes(issue.id)) &&
  (!where.creatorTeamMemberId ||
    issue.creatorTeamMemberId === where.creatorTeamMemberId) &&
  (!where.state || where.state === issue.state) &&
  (!where.createdAt?.gte || issue.createdAt >= where.createdAt.gte) &&
  (!where.createdAt?.lt || issue.createdAt < where.createdAt.lt) &&
  (!where.closedAt?.gte ||
    (issue.closedAt && issue.closedAt >= where.closedAt.gte)) &&
  (!where.AND || where.AND.every((condition) => matches(issue, condition)));
let session = { user: { role: "MANAGER", isSuperadmin: false } };
globalThis.__memberIssueFixtures = {
  auth: async () => session,
  prisma: {
    teamMember: { findUnique: async () => ({ id: "member" }) },
    issueAssignee: {
      findMany: async () => fixtures.map((i) => ({ issueId: i.id })),
    },
    issue: {
      count: async ({ where }) =>
        fixtures.filter((i) => matches(i, where)).length,
      findMany: async ({ where, skip = 0, take = 100 }) =>
        fixtures
          .filter((i) => matches(i, where))
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(skip, skip + take),
    },
  },
};
const result = await build({
  entryPoints: ["src/app/api/members/[id]/issues/route.ts"],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  packages: "external",
  plugins: [
    {
      name: "member-fixtures",
      setup(builder) {
        builder.onResolve(
          { filter: /^@\/lib\/(auth|prisma|settings|session)$/ },
          ({ path }) => ({ path, namespace: "fixture" }),
        );
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
          contents: {
            "@/lib/auth":
              "export const auth = globalThis.__memberIssueFixtures.auth;",
            "@/lib/prisma":
              "export const prisma = globalThis.__memberIssueFixtures.prisma;",
            "@/lib/settings":
              "export const getWorkloadThresholds = async () => ({ lowMax: 3, mediumMax: 7, staleDays: 30 });",
            "@/lib/session":
              "export const isAdminRole = s => s.user.isSuperadmin || s.user.role === 'ADMIN';",
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
const get = async (query) => {
  const response = await module.exports.GET(
    { nextUrl: new URL("http://localhost/api/members/member/issues?" + query) },
    { params: Promise.resolve({ id: "member" }) },
  );
  return { status: response.status, body: await response.json() };
};
const stale = (await get("state=open&type=assigned&stale=true&limit=1")).body;
assert.equal(stale.total, 1);
assert.equal(stale.data[0].id, "stale");
assert.equal(stale.data[0].isStale, true);
assert.equal((await get("state=open&type=assigned")).body.total, 2);
assert.equal(
  (await get("state=closed&type=assigned&days=30")).body.data[0].id,
  "resolved-recently",
);
assert.equal((await get("state=closed&type=assigned&days=30")).body.total, 1);
assert.equal((await get("type=created&days=30")).body.total, 1);
assert.equal(
  (await get("state=open&stale=true&page=2&limit=1")).body.data.length,
  0,
);
assert.equal((await get("state=open&stale=true&page=2&limit=1")).body.total, 1);
session = { user: { role: "DEVELOPER", id: "other", isSuperadmin: false } };
assert.equal((await get("stale=true")).status, 403);
session.user.id = 'member';
assert.equal((await get('stale=true')).status, 200);
session.user.role = 'UNASSIGNED';
assert.equal((await get('stale=true')).status, 403, 'Unassigned cannot read profiles, even own ID');
session = null;
assert.equal((await get("stale=true")).status, 401);
console.log(
  "Member issue checks passed: stale filtering before pagination, open assignments, created/resolved periods, and access control.",
);
