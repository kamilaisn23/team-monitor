import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { build } from "esbuild";

const require = createRequire(import.meta.url);
const now = Date.now();
const members = [
  { id: "m1", name: "Alpha Dev", role: "DEVELOPER", isActive: true, teams: [{ teamId: "a" }] },
  { id: "m2", name: "Beta Dev", role: "DEVELOPER", isActive: true, teams: [{ teamId: "b" }] },
  { id: "m3", name: "Inactive", role: "DEVELOPER", isActive: false, teams: [{ teamId: "a" }] },
];
const repos = [
  { id: "r1", name: "team/web", ignored: false, platform: "GITHUB", teams: [{ teamId: "a" }] },
  { id: "r2", name: "team/api", ignored: false, platform: "GITLAB", teams: [{ teamId: "b" }] },
  { id: "r3", name: "ignored", ignored: true, platform: "GITHUB", teams: [] },
];
const makeIssue = (id, repoIndex, days, assignees, creator = "m1", state = "OPEN") => ({
  id, title: id, state, url: "https://github.com/team/web/issues/1", creatorTeamMemberId: creator,
  repository: repos[repoIndex], createdAt: new Date(now - days * 86400000),
  assignees: assignees.map((teamMemberId) => ({ teamMemberId, teamMember: members.find((member) => member.id === teamMemberId) || null })),
});
const issues = [
  makeIssue("stale", 0, 40, ["m1"]), makeIssue("shared", 0, 39, ["m1", "m2"]),
  makeIssue("fresh", 0, 2, ["m1"]), makeIssue("unassigned-a", 0, 5, []),
  makeIssue("unassigned-b", 1, 50, [], "m2"), makeIssue("external-assignee", 0, 3, [null]),
  makeIssue("ignored", 2, 60, []), makeIssue("closed", 0, 45, ["m1"], "m1", "CLOSED"),
];
function match(value, where = {}) {
  return Object.entries(where).every(([key, condition]) => {
    if (key === "AND") return condition.every((part) => match(value, part));
    if (key === "OR") return condition.some((part) => match(value, part));
    const field = value[key];
    if (condition && typeof condition === "object" && !(condition instanceof Date)) {
      if ("in" in condition) return condition.in.includes(field);
      if ("not" in condition) return field !== condition.not;
      if ("contains" in condition) return field.toLowerCase().includes(condition.contains.toLowerCase());
      if ("lt" in condition) return field < condition.lt;
      if ("some" in condition) return field.some((entry) => match(entry, condition.some));
      if ("none" in condition) return !field.some((entry) => match(entry, condition.none));
      return match(field, condition);
    }
    return field === condition;
  });
}
const rows = new Map();
const followUps = new Map();
let session = { user: { name: "Test Manager", role: "MANAGER", isSuperadmin: false } };
let simulateCreateRace = false, simulateUpdateRace = false;
globalThis.__attentionSmoke = {
  auth: async () => session,
  prisma: {
    $transaction: async (callback) => callback(globalThis.__attentionSmoke.prisma),
    teamMember: {
      findMany: async ({ where }) => members.filter((member) => match(member, where)),
      findFirst: async ({ where }) => members.find((member) => match(member, where)) || null,
    },
    issue: {
      findMany: async ({ where, skip = 0, take }) => issues.filter((issue) => match(issue, where)).sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id)).slice(skip, take ? skip + take : undefined),
      count: async ({ where }) => issues.filter((issue) => match(issue, where)).length,
      findFirst: async ({ where }) => issues.find((issue) => match(issue, where)) || null,
    },
    followUp: {
      findMany: async ({ where }) => [...followUps.values()].filter((row) => match(row, where)),
      findUnique: async ({ where }) => followUps.get(where.issueId) || null,
      create: async ({ data }) => {
        if (simulateCreateRace || followUps.has(data.issueId)) throw Object.assign(new Error("Duplicate"), { code: "P2002" });
        const row = { ...data, updatedAt: data.updatedAt || new Date() };
        followUps.set(data.issueId, row); return row;
      },
      updateMany: async ({ where, data }) => {
        const row = followUps.get(where.issueId);
        if (simulateUpdateRace || !row || (where.revision !== undefined && row.revision !== where.revision)) return { count: 0 };
        followUps.set(where.issueId, { ...row, ...data }); return { count: 1 };
      },
    },
    followUpHistory: { create: async ({ data }) => data },
    setting: {
      findMany: async ({ where }) => [...rows.values()].filter((row) => match(row, where)),
      findUnique: async ({ where }) => rows.get(where.key) || null,
      create: async ({ data }) => {
        if (simulateCreateRace || rows.has(data.key)) throw Object.assign(new Error("Duplicate"), { code: "P2002" });
        rows.set(data.key, data); return data;
      },
      updateMany: async ({ where, data }) => {
        const row = rows.get(where.key);
        if (simulateUpdateRace || !row || !match(row, where)) return { count: 0 };
        rows.set(where.key, { ...row, ...data }); return { count: 1 };
      },
    },
  },
};
const result = await build({
  stdin: { contents: `export { GET } from './src/app/api/dashboard/attention/route'; export { PATCH } from './src/app/api/dashboard/attention/[issueId]/route'; export { dashboardTrends, WEEK_MS } from './src/lib/dashboard-trends'; export { getPreviewAttention } from './src/lib/preview-attention';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: "node", format: "cjs", packages: "external",
  plugins: [{ name: "attention-fixtures", setup(builder) {
    builder.onResolve({ filter: /^@\/lib\/(auth|prisma|settings|session)$/ }, ({ path }) => ({ path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({ contents: {
      "@/lib/auth": "export const auth = globalThis.__attentionSmoke.auth;",
      "@/lib/prisma": "export const prisma = globalThis.__attentionSmoke.prisma;",
      "@/lib/settings": "export const getWorkloadThresholds = async () => ({ staleDays: 30 });",
      "@/lib/session": 'export const isAdminRole = (s) => s.user.isSuperadmin || s.user.role === "ADMIN";',
    }[path], loader: "js" }));
  } }],
});
const module = { exports: {} };
new Function("require", "module", "exports", result.outputFiles[0].text)(require, module, module.exports);
const { GET, PATCH, dashboardTrends, WEEK_MS, getPreviewAttention } = module.exports;
const get = async (query = "") => {
  const response = await GET({ nextUrl: new URL(`http://localhost/api/dashboard/attention?${query}`) });
  return { status: response.status, body: await response.json() };
};
const draft = { status: "following_up", note: "  Discuss priorities  ", ownerId: "m1", expectedRevision: null };
const patch = async (id = "stale", body = draft) => {
  const request = new Request('http://localhost/api/dashboard/attention/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const response = await PATCH(request, { params: Promise.resolve({ issueId: id }) });
  return { status: response.status, body: await response.json() };
};
const initial = (await get()).body;
assert.equal(initial.total, 4, "Unique stale and unassigned issues; exclude closed, ignored, fresh assigned issues");
assert.deepEqual(initial.counts, { unreviewed: 4, following_up: 0, reviewed: 0 });
assert.equal((await get("teamId=a")).body.total, 3, "Unassigned work follows repository teams");
assert.equal((await get("teamId=b")).body.total, 2);
assert.equal((await get("teamId=missing")).body.total, 0);
assert.equal((await get("platform=gitlab")).body.total, 1);
assert.equal((await get("repositoryId=missing")).body.total, 0);
assert.equal((await get("reason=unassigned")).body.total, 2);
assert.equal((await get("reason=unassigned")).body.counts.unreviewed, 2);
assert.equal((await get("reason=stale")).body.total, 3);
assert.equal((await get("name=Alpha")).body.total, 3);
assert.equal((await get("name=missing")).body.total, 0);
assert.equal((await get("active=false")).body.total, 0);
assert.equal((await get("attentionPage=Infinity")).body.page, 1);
assert.equal((await get("teamId=a")).body.owners.length, 1);
const shared = (await get("teamId=a")).body.data.find((issue) => issue.id === "shared");
const updated = await patch();
assert.equal(updated.status, 200);
assert.equal(updated.body.note, "Discuss priorities");
assert.ok(updated.body.revision);
assert.equal((await get("status=following_up")).body.total, 1);
assert.equal((await get("status=unreviewed")).body.total, 3);
assert.equal((await patch()).status, 409, "Stale revision cannot overwrite a newer note");
assert.equal((await patch("stale", { ...draft, note: "x".repeat(2001) })).status, 400);
assert.equal((await patch("stale", { ...draft, status: "invalid" })).status, 400);
assert.equal((await patch("stale", { ...draft, ownerId: "m3", expectedRevision: updated.body.revision })).status, 400);
assert.equal((await patch("stale", { ...draft, ownerId: "missing", expectedRevision: updated.body.revision })).status, 400);
assert.equal((await patch("ignored")).status, 404);
assert.equal((await patch("closed")).status, 404);
assert.equal((await patch("missing")).status, 404);
simulateUpdateRace = true;
assert.equal((await patch("stale", { ...draft, expectedRevision: updated.body.revision })).status, 409);
simulateUpdateRace = false; simulateCreateRace = true;
assert.equal((await patch("shared")).status, 409);
simulateCreateRace = false;
const reviewed = await patch("stale", { ...draft, status: "reviewed", expectedRevision: updated.body.revision });
assert.equal(reviewed.status, 200);
assert.equal((await get("status=reviewed")).body.total, 1);
session = null;
assert.equal((await get()).status, 401); assert.equal((await patch()).status, 401);
for (const role of ["DEVELOPER", "UNASSIGNED"]) {
  session = { user: { role, isSuperadmin: false } };
  assert.equal((await get()).status, 403); assert.equal((await patch()).status, 403);
}
session = { user: { name: "Admin", role: "ADMIN", isSuperadmin: false } };
assert.equal((await get()).status, 200);
assert.equal((await patch("shared")).status, 200);
session = { user: { name: "Superadmin", role: "SUPERADMIN", isSuperadmin: true } };
assert.equal((await get()).status, 200);
const boundary = new Date("2026-10-14T00:00:00Z");
const trend = dashboardTrends([
  { createdAt: new Date(boundary.getTime() - WEEK_MS), closedAt: boundary },
  { createdAt: new Date(boundary.getTime() - 4 * WEEK_MS), closedAt: new Date(boundary.getTime() + 1) },
], boundary);
assert.deepEqual(trend.weeks.map((week) => week.created), [1, 0, 0, 1], "A boundary event is counted once");
assert.deepEqual(trend.weeks.map((week) => week.resolved), [0, 0, 0, 1], "Exclude future closures");
const preview = getPreviewAttention(new URLSearchParams("active=true"));
assert.equal(preview.total, 15);
assert.equal(getPreviewAttention(new URLSearchParams("active=true&reason=unassigned")).total, 4);
assert.equal(getPreviewAttention(new URLSearchParams("name=missing")).total, 0);
assert.equal(getPreviewAttention(new URLSearchParams("repositoryId=missing")).total, 0);
assert.equal(getPreviewAttention(new URLSearchParams("status=reviewed"), { [preview.data[0].id]: reviewed.body }).total, 1);
console.log("Attention checks passed: scoped stale/unassigned issues, status/reason filters, owners, pagination, persisted notes, validation, optimistic concurrency, access control and weekly boundaries.");
