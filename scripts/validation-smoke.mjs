import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { NextRequest } = require('next/server');
let session = { user: { role: 'ADMIN', isSuperadmin: true } }, reads = 0, writes = 0, transactionFailure = false;
const member = { id: 'm1', name: 'Member', role: 'DEVELOPER', teams: [] };
const repo = { id: 'r1', name: 'Repo', teams: [], ignored: false };
const read = value => async () => { reads++; return value; };
const write = value => async ({ data }) => { writes++; return { ...value, ...data }; };
const prisma = {
  teamMember: { findMany: read([]), findUnique: read(member), create: write(member), update: write(member) },
  team: { findMany: read([]), findUnique: read({ id: 't1' }), create: write({ id: 't1' }), update: write({ id: 't1' }), count: async ({ where }) => { reads++; return where.id.in.filter(id => id === 't1').length; } },
  repository: { findMany: read([]), findUnique: read(repo), update: write(repo) },
  repositoryTeam: { deleteMany: async () => { writes++; return { count: 0 }; }, createMany: async () => { writes++; return { count: 0 }; } },
  teamMembership: { create: write({}) },
  issue: { groupBy: read([]) }, issueAssignee: { groupBy: read([]) },
  $transaction: async callback => { if (transactionFailure) throw Object.assign(new Error('private SQL detail'), { code: 'P2003' }); return callback(prisma); },
};
globalThis.__validation = { auth: async () => session, prisma, setThresholds: async () => { writes++; } };
const handlers = {
  report: ['GET', 'reports/monthly'], csv: ['GET', 'reports/export'], members: ['GET', 'members'], repos: ['GET', 'repositories'],
  memberCreate: ['POST', 'members'], memberPatch: ['PATCH', 'members/[id]'],
  teamCreate: ['POST', 'teams'], teamPatch: ['PATCH', 'teams/[id]'], membership: ['POST', 'teams/[id]/members'], repoPatch: ['PATCH', 'repositories/[id]'], settings: ['PATCH', 'settings'],
};
const result = await build({
  stdin: { contents: Object.entries(handlers).map(([name, [method, path]]) => `export { ${method} as ${name} } from './src/app/api/${path}/route';`).join('\n') + `\nexport { parseReportQuery } from './src/lib/report-query';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
  plugins: [{ name: 'validation-fixtures', setup(builder) {
    builder.onResolve({ filter: /^@\/lib\/(auth|prisma|kerjabaik-flag|settings)$/ }, ({ path }) => ({ path, namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({ contents: {
      '@/lib/auth': 'export const auth = globalThis.__validation.auth;',
      '@/lib/prisma': 'export const prisma = globalThis.__validation.prisma;',
      '@/lib/kerjabaik-flag': 'export const isKerjabaikSyncEnabled = () => false;',
      '@/lib/settings': 'export const getWorkloadThresholds = async () => ({ lowMax: 3, mediumMax: 7, staleDays: 30 }); export const setWorkloadThresholds = globalThis.__validation.setThresholds;',
    }[path], loader: 'js' }));
  } }],
});
const module = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
async function call(name, { query = '', body, raw, headers = {} } = {}) {
  const method = handlers[name][0];
  const request = new NextRequest('http://localhost/api?' + query, { method, ...(method !== 'GET' ? { headers: { 'Content-Type': 'application/json', ...headers }, body: raw ?? JSON.stringify(body) } : {}) });
  const response = await module.exports[name](request, { params: Promise.resolve({ id: name === 'repoPatch' ? 'r1' : name === 'memberPatch' ? 'm1' : 't1' }) });
  return { status: response.status, response, body: response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text() };
}
for (const query of ['', 'month=2026-13', 'month=garbage', 'month=2026-02-01', 'month=2026-10%0D%0Aevil', 'start=2026-02-29&end=2026-03-01', 'start=2026-02-30&end=2026-03-01', 'start=2026-10-10', 'start=2026-10-10&end=2026-10-01', 'month=2026-10&page=NaN', 'month=2026-10&page=Infinity', 'month=2026-10&page=-1', 'month=2026-10&page=1.5', 'month=2026-10&limit=101', 'month=2026-10&limit=0', 'month=2026-10&platform=unknown', 'month=2026-10&groupBy=unknown', 'month=2026-10&sort=unknown', 'month=2026-10&sortDir=unknown', 'month=2026-10&name=' + 'x'.repeat(201), 'month=2026-10&teamId=' + 'x'.repeat(129)]) {
  for (const name of ['report', 'csv']) {
    const before = reads;
    const result = await call(name, { query });
    assert.equal(result.status, 400, query);
    assert.equal(typeof result.body.error, 'string');
    assert.equal(reads, before, 'Invalid report query must not reach the database');
  }
}
const leap = module.exports.parseReportQuery(new URLSearchParams('start=2024-02-29&end=2024-03-01'));
assert.equal(leap.start.toISOString(), '2024-02-28T17:00:00.000Z');
assert.equal(leap.end.toISOString(), '2024-03-01T16:59:59.999Z');
assert.equal((await call('report', { query: 'month=2026-10&limit=100' })).status, 200);
for (const [name, query] of [['members', 'role=bad'], ['members', 'active=yes'], ['repos', 'platform=unknown'], ['repos', 'ignored=1']]) {
  const before = reads;
  assert.equal((await call(name, { query })).status, 400); assert.equal(reads, before);
}
const mutations = Object.keys(handlers).filter(name => handlers[name][0] !== 'GET');
for (const name of mutations) {
  for (const raw of ['{', 'null', '[]', '"text"', 'true']) {
    const before = writes;
    assert.equal((await call(name, { raw })).status, 400, name + raw);
    assert.equal(writes, before);
  }
  assert.equal((await call(name, { raw: JSON.stringify({ name: 'x'.repeat(34000) }) })).status, 413);
  assert.equal((await call(name, { raw: '{"name":"' + 'é'.repeat(17000) + '"}' })).status, 413, 'UTF-8 byte limit');
  assert.equal((await call(name, { raw: '{}', headers: { 'Content-Length': '999999' } })).status, 413);
}
for (const [name, body] of [
  ['memberCreate', { name: 42, role: 'DEVELOPER' }], ['memberCreate', { name: 'Valid', role: 'SUPERADMIN' }],
  ['memberCreate', { name: 'x'.repeat(201), role: 'DEVELOPER' }], ['memberPatch', { isActive: 'false' }],
  ['memberPatch', { name: '  ' }], ['memberPatch', { usernameGithub: [] }], ['memberPatch', { role: null }],
  ['teamCreate', { name: 'Team\nname' }], ['teamPatch', { name: 'Team', unknown: true }],
  ['membership', { memberId: 1 }], ['repoPatch', { ignored: 'true' }], ['repoPatch', { teamIds: ['t1', 't1'] }],
  ['repoPatch', { teamIds: 't1' }], ['repoPatch', { teamIds: Array(101).fill('t1') }], ['repoPatch', {}],
  ['settings', { lowMax: true, mediumMax: 8, staleDays: 30 }], ['settings', { lowMax: 4, mediumMax: 3, staleDays: 30 }],
  ['settings', { lowMax: 4, mediumMax: 8, staleDays: '30' }], ['settings', { lowMax: 4, mediumMax: 8, staleDays: 36501 }],
]) {
  const before = writes;
  assert.equal((await call(name, { body })).status, 400, name);
  assert.equal(writes, before, 'Invalid fields must not mutate');
}
assert.equal((await call('repoPatch', { body: { teamIds: ['missing'] } })).status, 400);
assert.equal((await call('memberCreate', { body: { name: 'Valid', role: 'DEVELOPER', isActive: false } })).status, 201);
assert.equal((await call('memberPatch', { body: { isActive: false, usernameGithub: null } })).status, 200);
assert.equal((await call('teamCreate', { body: { name: 'Team' } })).status, 201);
assert.equal((await call('teamPatch', { body: { name: 'Team' } })).status, 200);
assert.equal((await call('membership', { body: { memberId: 'm1' } })).status, 201);
assert.equal((await call('repoPatch', { body: { ignored: false, teamIds: ['t1'] } })).status, 200);
assert.equal((await call('settings', { body: { lowMax: 4, mediumMax: 8, staleDays: 30 } })).status, 200);
transactionFailure = true;
const failedRelation = await call('repoPatch', { body: { ignored: true } });
assert.equal(failedRelation.status, 400);
assert.ok(!JSON.stringify(failedRelation.body).includes('private SQL detail'));
session = { user: { role: 'DEVELOPER', id: 'm1', isSuperadmin: false } };
assert.equal((await call('memberCreate', { raw: '{' })).status, 403, 'Permissions precede input validation');
session = null;
assert.equal((await call('report', { query: 'month=bad' })).status, 401);
console.log('Validation checks passed: calendar/ranges, enums/pagination, ID/search lengths, JSON shape/UTF-8 byte limits, CRUD types, foreign teams, no invalid writes and redacted errors.');
