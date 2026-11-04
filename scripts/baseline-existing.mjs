import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
if (process.env.BASELINE_BACKUP_VERIFIED !== "true") throw new Error("Verify a backup/restore first, then set BASELINE_BACKUP_VERIFIED=true for this one-time adoption");
const migrationNames = ["0_init", "20260422000000_add_kerjabaik_employee_id", "20260423000000_add_kerjabaik_project_id", "20260702000000_add_admin_role"];
const prisma = path.resolve("node_modules/prisma/build/index.js");
// Read-only comparison must succeed before any metadata is written. Keep the
// URL in the environment rather than command arguments or console output.
const diff = spawnSync(process.execPath, [prisma, "migrate", "diff", "--from-schema-datasource", "prisma/schema.prisma", "--to-schema-datamodel", "prisma/baseline-schema.prisma", "--exit-code"], { env: process.env, encoding: "utf8" });
if (diff.status !== 0) throw new Error("Existing schema differs from the current schema (or cannot be inspected); adoption stopped");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
await client.connect();
try {
  const table = await client.query("SELECT to_regclass('public._prisma_migrations') AS name");
  let applied = [];
  if (table.rows[0].name) {
    const rows = await client.query('SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"');
    if (rows.rows.some(row => !migrationNames.includes(row.migration_name) || (!row.finished_at && !row.rolled_back_at))) throw new Error("Unexpected or unresolved migration history; review manually");
    applied = rows.rows.filter(row => row.finished_at).map(row => row.migration_name);
  }
  for (const name of migrationNames) {
    if (applied.includes(name)) continue;
    if (!fs.existsSync(path.join("prisma/migrations", name, "migration.sql"))) throw new Error("Required migration missing");
    try { execFileSync(process.execPath, [prisma, "migrate", "resolve", "--applied", name], { env: process.env, stdio: "pipe" }); }
    catch { throw new Error(`Unable to record ${name}; review history before retrying`); }
    console.log(`Recorded ${name} as already applied (no application schema/data changes)`);
  }
} finally { await client.end(); }
