import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
if (!process.env.DATABASE_URL) throw new Error('Provide a disposable/local DATABASE_URL for the lock integration check');
const require = createRequire(import.meta.url);
const built = await build({ entryPoints: ['src/lib/sync-lock.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external' });
const module = { exports: {} };
new Function('require', 'module', 'exports', built.outputFiles[0].text)(require, module, module.exports);
const childSource = `const pg = require('pg'); const c = new pg.Client({ connectionString: process.env.DATABASE_URL }); (async () => { await c.connect(); const r = await c.query('SELECT pg_try_advisory_lock($1) AS acquired', [894316025]); if (!r.rows[0].acquired) throw Error('Lock occupied'); console.log('ready'); setInterval(() => {}, 1000); })().catch(() => { console.error('Lock child failed'); process.exit(1); });`;
const owner = spawn(process.execPath, ['-e', childSource], { stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
owner.stderr.on('data', () => {});
let timeout;
try {
  await Promise.race([once(owner.stdout, 'data'), once(owner, 'exit').then(() => { throw new Error('Lock owner could not connect or acquire lock'); }), new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Lock owner timeout')), 10000); })]);
  clearTimeout(timeout);
  const contender = await module.exports.acquireSyncLock(() => {});
  assert.equal(contender, null, 'Another process must not acquire the held sync lock');
  owner.kill();
  await once(owner, 'exit');
  let recovered;
  for (let attempt = 0; attempt < 20 && !recovered; attempt++) {
    recovered = await module.exports.acquireSyncLock(() => {});
    if (!recovered) await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(recovered, 'Database must release the lock after owner process death');
  await recovered();
  console.log('PostgreSQL integration passed: two processes cannot overlap; owner death releases the lock. No application records were modified.');
} finally { clearTimeout(timeout); if (owner.exitCode === null) owner.kill(); }
