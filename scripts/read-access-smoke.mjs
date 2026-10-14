import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let session = { user: { role: 'DEVELOPER', isSuperadmin: false, id: 'a' } };
const time = new Date('2026-10-10T00:00:00Z');
const memberships = [{ teamMemberId: 'a' }, { teamMemberId: 'b' }];
const teams = [{ id: 't1', name: 'Shared team', members: memberships }, { id: 't2', name: 'Other team', members: [memberships[1]] }];
const members = [
  { id: 'a', name: 'Alpha Dev', role: 'DEVELOPER', isActive: true, teams: [{ team: teams[0], teamId: 't1' }] },
  { id: 'b', name: 'Beta Dev', role: 'DEVELOPER', isActive: true, teams: [{ team: teams[0], teamId: 't1' }, { team: teams[1], teamId: 't2' }] },
];
const repos = [{ id: 'ra', name: 'Self repo', platform: 'GITHUB', ignored: false, teams: [{ team: teams[0], teamId: 't1' }] }, { id: 'rb', name: 'Other repo', platform: 'GITHUB', ignored: false, teams: [{ team: teams[1], teamId: 't2' }] }];
const issues = ['a', 'b'].map((id, index) => ({ id: 'i' + id, title: id, state: 'OPEN', repository: repos[index], repositoryId: repos[index].id, creatorTeamMemberId: id, createdAt: time, closedAt: null, syncedAt: new Date(time.getTime() + index * 1000), assignees: [{ teamMemberId: id }] }));
repos.forEach(repo => { repo.issues = issues.filter(issue => issue.repositoryId === repo.id); });
function match(value, where = {}) {
  return Object.entries(where).every(([key, condition]) => {
    if (key === 'OR') return condition.some(part => match(value, part));
    if (key === 'AND') return condition.every(part => match(value, part));
    const field = value[key];
    if (condition && typeof condition === 'object' && !(condition instanceof Date)) {
      if ('not' in condition) return field !== condition.not;
      if ('in' in condition) return condition.in.includes(field);
      if ('contains' in condition) return field.toLowerCase().includes(condition.contains.toLowerCase());
      if ('some' in condition) return field.some(item => match(item, condition.some));
      if ('gte' in condition || 'lte' in condition) return (!condition.gte || field >= condition.gte) && (!condition.lte || field <= condition.lte);
      return match(field, condition);
    }
    return field === condition;
  });
}
function group(rows, by, countField) {
  const counts = new Map();
  rows.forEach(row => counts.set(row[by], (counts.get(row[by]) || 0) + 1));
  return [...counts].map(([key, count]) => ({ [by]: key, _count: { [countField]: count } }));
}
globalThis.__readAccess = {
  auth: async () => session,
  prisma: {
    teamMember: { findMany: async ({ where }) => members.filter(member => match(member, where)), findUnique: async ({ where }) => members.find(member => member.id === where.id) },
    issue: {
      groupBy: async ({ where, by }) => group(issues.filter(issue => match(issue, where)), by[0], 'id'),
      aggregate: async ({ where }) => ({ _max: { syncedAt: issues.filter(issue => match(issue, where)).map(issue => issue.syncedAt).sort((a, b) => b - a)[0] || null } }),
    },
    issueAssignee: { groupBy: async ({ where }) => group(issues.flatMap(issue => issue.assignees.map(assignee => ({ ...assignee, issue, issueId: issue.id }))).filter(row => match(row, where)), 'teamMemberId', 'issueId') },
    team: { findMany: async ({ where, include }) => teams.filter(team => match(team, where)).map(team => ({ ...team, _count: { members: team.members.filter(member => include._count.select.members === true || match(member, include._count.select.members.where)).length } })) },
    repository: { findMany: async ({ where, include }) => repos.filter(repo => match(repo, where)).map(repo => ({ ...repo, teams: repo.teams.filter(team => match(team, include.teams.where)) })) },
  },
};
const paths = {
  members: 'members', teams: 'teams', repos: 'repositories', report: 'reports/monthly', csv: 'reports/export', syncStatus: 'sync/status',
  profile: 'members/[id]', stats: 'members/[id]/stats', timeline: 'members/[id]/timeline', profileRepos: 'members/[id]/repositories',
};
const result = await build({
  stdin: { contents: Object.entries(paths).map(([name, path]) => `export { GET as ${name} } from './src/app/api/${path}/route';`).join('\n'), resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'read-fixtures', setup(builder) {
    builder.onResolve({ filter: /^@\/lib\/(auth|prisma|kerjabaik-flag|settings)$/ }, ({ path }) => ({ path, namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ contents: {
      '@/lib/auth': 'export const auth = globalThis.__readAccess.auth;',
      '@/lib/prisma': 'export const prisma = globalThis.__readAccess.prisma;',
      '@/lib/kerjabaik-flag': 'export const isKerjabaikSyncEnabled = () => false;',
      '@/lib/settings': 'export const getWorkloadThresholds = async () => ({ lowMax: 3, mediumMax: 7, staleDays: 30 });',
    }[path], loader: 'js' }));
  } }],
});
const module = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
async function get(name, query = '', id = 'a') {
  const response = await module.exports[name]({ nextUrl: new URL('http://localhost/api?month=2026-10&' + query) }, { params: Promise.resolve({ id }) });
  return { status: response.status, body: response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text() };
}
assert.deepEqual((await get('members')).body.map(member => member.id), ['a']);
assert.equal((await get('members', 'teamId=t2')).body.length, 0);
assert.deepEqual((await get('report')).body.data.map(member => member.memberId), ['a']);
assert.equal((await get('report')).body.totals.issuesCreated, 1);
assert.equal((await get('report', 'name=Beta')).body.total, 0);
assert.equal((await get('report', 'teamId=t2')).body.total, 0, 'Team filter cannot bypass own scope');
assert.ok((await get('csv')).body.includes('Alpha Dev'));
assert.ok(!(await get('csv', 'memberId=b')).body.includes('Beta Dev'));
assert.deepEqual((await get('teams')).body.map(team => team.id), ['t1']);
assert.equal((await get('teams')).body[0].memberCount, 1, 'Shared team count must not reveal other members');
assert.deepEqual((await get('repos')).body.map(repo => repo.id), ['ra']);
assert.equal((await get('repos', 'teamId=t2')).body.length, 0);
assert.equal((await get('syncStatus')).body.lastSyncedAt, time.toISOString());
assert.equal((await get('profile')).status, 200);
members[0].name = '=1+2';
assert.ok((await get('csv')).body.includes('"\t=1+2"'), 'Server export protects source text from formulas');
members[0].name = 'Alpha Dev';
for (const name of ['profile', 'stats', 'timeline', 'profileRepos']) assert.equal((await get(name, '', 'b')).status, 403);
for (const badSession of [{ user: { role: 'UNASSIGNED', id: 'a', isSuperadmin: false } }, { user: { role: 'DEVELOPER', isSuperadmin: false } }, null]) {
  session = badSession;
  for (const name of Object.keys(paths)) assert.equal((await get(name)).status, session ? 403 : 401, name);
}
for (const role of ['MANAGER', 'ADMIN']) {
  session = { user: { role, isSuperadmin: false } };
  assert.equal((await get('report')).body.total, 2);
  assert.ok((await get('csv')).body.includes('Beta Dev'));
  assert.equal((await get('teams')).body.length, 2);
  assert.equal((await get('repos')).body.length, 2);
  const selected = (await get('report', 'teamId=t2')).body;
  assert.deepEqual(selected.data.map(member => member.memberId), ['b']);
  assert.equal(selected.totals.issuesCreated, 1);
  const grouped = (await get('report', 'teamId=t2&groupBy=team')).body;
  assert.deepEqual(grouped.groups.map(team => team.teamId), ['t2'], 'Cross-team member should not create out-of-scope groups');
  const csv = (await get('csv', 'teamId=t2')).body;
  assert.ok(csv.includes('Beta Dev') && !csv.includes('Alpha Dev'));
  assert.equal((await get('report', 'teamId=missing')).body.total, 0);
  assert.equal((await get('report', 'teamId=missing&groupBy=team')).body.groups.length, 0);
  assert.equal((await get('csv', 'teamId=missing')).body.split('\n').length, 1, 'Empty scope exports only headers');
  assert.deepEqual((await get('report', 'teamId=t2&page=2')).body.totals, selected.totals, 'Totals do not depend on directory page');
}
console.log('Read access checks passed: personal reports/CSV, members, teams/counts, repositories, sync timestamps, profile guards, missing identity and unassigned denial.');
