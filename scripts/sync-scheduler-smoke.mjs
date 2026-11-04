import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const require = createRequire(import.meta.url);
async function bundle(entry, fixtures = {}) {
  const result = await build({ entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
    plugins: [{ name: 'fixtures', setup(b) {
      b.onResolve({ filter: /.*/ }, args => fixtures[args.path] ? { path: args.path, namespace: 'fixtures' } : undefined);
      b.onLoad({ filter: /.*/, namespace: 'fixtures' }, args => ({ contents: fixtures[args.path], loader: 'js' }));
    } }] });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
  return module.exports;
}
const config = await bundle('src/lib/sync-config.ts');
const env = { GITHUB_TOKEN: 'fixture', GITHUB_USER_NAME: 'fixture', GITLAB_BASE_URL: 'https://example.invalid', GITLAB_GROUP_ID: '1', GITLAB_GROUP_TOKEN: 'fixture', KERJABAIK_BASE_URL: 'https://example.invalid', KERJABAIK_SERVICE_TOKEN: 'fixture' };
assert.equal(config.sourceConfigured('gitlab', { GITLAB_GROUP_TOKEN: 'fixture' }), false);
assert.equal(config.nextScheduledAt('github', new Date('2026-10-14T18:00:00Z'), env), '2026-10-14T19:00:00.000Z');
assert.equal(config.nextScheduledAt('kerjabaik', new Date('2026-10-14T18:00:00Z'), env), '2026-10-14T19:00:00.000Z');
assert.equal(config.nextScheduledAt('github', new Date(), { ...env, SYNC_SCHEDULER_ENABLED: 'false' }), null);
assert.equal(config.nextScheduledAt('github', new Date(), { ...env, SYNC_CRON_SCHEDULE: 'bad' }), null);
assert.equal(config.nextScheduledAt('github', new Date(), {}), null);

let locked = false, releaseCount = 0, onLost, worker, latest = null, records = new Map(), settings = new Map(), updates = 0;
class FixtureWorker extends EventEmitter {
  constructor() { super(); worker = this; }
  async terminate() { this.emit('exit', 1); }
}
globalThis.__syncWorker = FixtureWorker;
globalThis.__syncLock = async lost => {
  if (locked) return null;
  locked = true; onLost = lost;
  return async () => { locked = false; releaseCount++; };
};
const prisma = {
  syncJob: {
    async findFirst() { return latest; },
    async findUnique({ where }) { return records.get(where.id); },
    async create({ data }) { records.set(data.id, { ...data }); },
    async update({ where, data }) { Object.assign(records.get(where.id), data); },
    async updateMany() { updates++; return { count: 0 }; },
  },
  setting: {
    async findUnique({ where }) { return settings.get(where.key); },
    async upsert({ where, create, update }) { settings.set(where.key, { ...(settings.get(where.key) || create), ...update }); },
  },
  async $transaction(fn) { return fn(prisma); },
};
globalThis.__syncPrisma = prisma;
const manager = await bundle('src/lib/sync-manager.ts', {
  './prisma': 'export const prisma = globalThis.__syncPrisma;',
  './sync-lock': 'export const acquireSyncLock = globalThis.__syncLock;',
  'node:worker_threads': 'export const Worker = globalThis.__syncWorker;',
});
assert.equal(updates, 0, 'Importing manager must not invalidate running jobs');
Object.assign(process.env, env, { SYNC_WORKER_PATH: 'fixture' });
const id = await manager.createSyncJob('github');
assert.equal(locked, true);
await assert.rejects(manager.createSyncJob('gitlab'), e => e.status === 409);
assert.equal(records.size, 1, 'Concurrent entry points must create only one job');
worker.emit('message', { type: 'done', errors: 0 });
assert.equal(locked, true, 'Terminal message must not release lock before worker exit');
worker.emit('exit', 0);
await new Promise(resolve => setImmediate(resolve));
assert.equal(locked, false);
assert.equal((await manager.getJob(id)).status, 'done');
latest = { finishedAt: new Date() };
await assert.rejects(manager.createSyncJob('gitlab'), e => e.status === 429 && e.retryAfter > 0);
assert.equal(locked, false, 'Cooldown releases lock');
latest = null;
const due = '2026-10-14T19:00:00.000Z';
await manager.createSyncJob('github', 'scheduled', due);
onLost();
await new Promise(resolve => setImmediate(resolve));
assert.equal(locked, false);
await assert.rejects(manager.createSyncJob('github', 'scheduled', due), e => e.message === 'Schedule already processed');
assert.equal(locked, false, 'Duplicate schedule releases lock');
assert.ok(releaseCount >= 4);

// Exercise the worker orchestrator: per-source failures are not swallowed and
// terminal events occur only after all sources have been attempted.
const emitted = [], healthRecords = new Map();
globalThis.__workerPort = { postMessage: event => emitted.push(event), close() {} };
globalThis.__workerData = { source: 'all', jobId: 'fixture', trigger: 'scheduled' };
let disconnected;
globalThis.__workerPrisma = {
  setting: {
    async upsert({ where, create }) { healthRecords.set(where.key, create.value); },
    async update({ where, data }) { healthRecords.set(where.key, data.value); },
  },
  async $disconnect() { disconnected(); },
};
globalThis.__runIssues = async (progress, source) => progress({ type: 'done', processed: 1, githubIssues: source === 'github' ? 3 : 0, gitlabIssues: 0, errors: source === 'gitlab' ? 1 : 0 });
globalThis.__runEmployees = async progress => progress({ type: 'kerjabaik_error', error: 'secret upstream payload must never be forwarded' });
const ended = new Promise(resolve => { disconnected = resolve; });
await bundle('scripts/sync-worker.ts', {
  'node:worker_threads': 'export const parentPort = globalThis.__workerPort; export const workerData = globalThis.__workerData;',
  '../src/lib/prisma': 'export const prisma = globalThis.__workerPrisma;',
  '../src/lib/sync': 'export const runSync = globalThis.__runIssues;',
  '../src/lib/sync-kerjabaik': 'export const runKerjabaikSync = globalThis.__runEmployees;',
});
await ended;
assert.equal(JSON.parse(healthRecords.get('sync:health:kerjabaik')).status, 'error');
assert.equal(JSON.parse(healthRecords.get('sync:health:github')).status, 'done');
assert.equal(JSON.parse(healthRecords.get('sync:health:gitlab')).status, 'error');
assert.equal(emitted.at(-1).type, 'error');
assert.equal(emitted.filter(event => ['error', 'done'].includes(event.type)).length, 1);
assert.ok(!JSON.stringify(emitted).includes('secret upstream'));

let session = null, healthCalls = 0;
globalThis.__healthAuth = async () => session;
globalThis.__sourceHealth = async () => { healthCalls++; return [{ source: 'github', configured: false, last: null }]; };
const route = await bundle('src/app/api/sync/health/route.ts', {
  '@/lib/auth': 'export const auth = globalThis.__healthAuth;',
  '@/lib/sync-health': 'export const getSourceHealth = globalThis.__sourceHealth;',
});
for (const role of [null, 'UNASSIGNED', 'DEVELOPER', 'MANAGER']) {
  session = role ? { user: { role } } : null;
  assert.equal((await route.GET()).status, role ? 403 : 401);
}
assert.equal(healthCalls, 0);
session = { user: { role: 'ADMIN' } };
assert.equal((await route.GET()).status, 200);
console.log('Scheduler checks passed: WIB schedules, disabled/missing config, global busy race, lock lifetime/loss, persistent cooldown and occurrence deduplication, source health permissions.');
