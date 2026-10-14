import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({path:'.env.local'}); dotenv.config();
if(!process.env.DATABASE_URL) throw Error('A disposable/local PostgreSQL DATABASE_URL is required');
const rootUrl = new URL(process.env.DATABASE_URL);
if (!['localhost','127.0.0.1','::1'].includes(rootUrl.hostname) && process.env.MIGRATION_TEST_ALLOW_REMOTE !== 'true') throw Error('Migration tests require local PostgreSQL by default');
const admin=new pg.Client({connectionString:rootUrl.toString()});
await admin.connect();
const prefix='tm_migration_test_'+randomBytes(4).toString('hex');
const names=[prefix+'_empty',prefix+'_existing',prefix+'_copy'];
const cli=path.resolve('node_modules/prisma/build/index.js');
function target(name) { const u=new URL(rootUrl);u.pathname='/'+name;return u.toString(); }
function run(args,name,script=cli) {
 const r=spawnSync(process.execPath,[script,...args],{env:{...process.env,DATABASE_URL:target(name),BASELINE_BACKUP_VERIFIED:'true'},encoding:'utf8'});
 if(r.status!==0) throw Error('Migration command failed: '+args.join(' '));
 return r.stdout;
}
async function inspect(name) {
 const c=new pg.Client({connectionString:target(name)});await c.connect();
 try {
 const all={};
 for(const table of ['team_members','settings','teams','repositories','team_memberships','repository_teams','issues','issue_assignees','sync_jobs']) {
  const rows=await c.query(`SELECT row_to_json(t) AS row FROM (SELECT * FROM "${table}") t`);
  all[table]=rows.rows.map(row=>row.row).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 }
 return createHash('sha256').update(JSON.stringify(all)).digest('hex');
 }finally{await c.end();}
}
try {
 await admin.query(`CREATE DATABASE "${names[0]}"`);
 run(['migrate','deploy'],names[0]);
 run(['migrate','diff','--from-schema-datasource','prisma/schema.prisma','--to-schema-datamodel','prisma/schema.prisma','--exit-code'],names[0]);
 console.log('Empty install: migrate deploy applied complete migration chain; schema matches');
 await admin.query(`CREATE DATABASE "${names[1]}"`);
 const currentSql=spawnSync(process.execPath,[cli,'migrate','diff','--from-empty','--to-schema-datamodel','prisma/schema.prisma','--script'],{encoding:'utf8'});
 assert.equal(currentSql.status,0);
 const c=new pg.Client({connectionString:target(names[1])});await c.connect();
 await c.query(currentSql.stdout);
 await c.query(`INSERT INTO team_members (id,name,role) VALUES ('fixture-member','Fixture Member','ADMIN'); INSERT INTO settings (key,value) VALUES ('fixture-preserve','existing record'); INSERT INTO teams (id,name) VALUES ('fixture-team','Fixture Team'); INSERT INTO team_memberships (team_id,team_member_id) VALUES ('fixture-team','fixture-member');`);
 await c.end();
 // Clone a populated existing installation before adopting migration metadata.
 await admin.query(`CREATE DATABASE "${names[2]}" WITH TEMPLATE "${names[1]}"`);
 const before=await inspect(names[2]);
 run([],names[2],path.resolve('scripts/baseline-existing.mjs'));
 run(['migrate','deploy'],names[2]);
 assert.equal(await inspect(names[2]),before,'Baseline and deploy must preserve every application row');
 run(['migrate','diff','--from-schema-datasource','prisma/schema.prisma','--to-schema-datamodel','prisma/schema.prisma','--exit-code'],names[2]);
 console.log('Populated clone: baseline metadata and repeat deploy preserved all application data');
 const broken=new pg.Client({connectionString:target(names[1])});await broken.connect();
 await broken.query('ALTER TABLE settings ADD COLUMN unexpected TEXT');await broken.end();
 const refused=spawnSync(process.execPath,['scripts/baseline-existing.mjs'],{env:{...process.env,DATABASE_URL:target(names[1]),BASELINE_BACKUP_VERIFIED:'true'},stdio:'pipe'});
 assert.notEqual(refused.status,0);
 const check=new pg.Client({connectionString:target(names[1])});await check.connect();
 assert.equal((await check.query("SELECT to_regclass('public._prisma_migrations') AS history")).rows[0].history,null);
 await check.end();
 console.log('Mismatched schema: baseline refused before creating migration metadata');
} finally {
 for(const name of names) {
  if(!/^tm_migration_test_[a-f0-9]{8}_(empty|existing|copy)$/.test(name)) throw Error('Invalid scratch cleanup target');
  await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
 }
 await admin.end();
}
