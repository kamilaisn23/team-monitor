import pg from "pg";
import { SYNC_LOCK_KEY } from "./sync-config";

// Dedicated session: do not use a transaction-mode database pooler.
export async function acquireSyncLock(onLost: () => void) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10_000, query_timeout: 10_000, keepAlive: true });
  let closing = false;
  client.on("error", () => { if (!closing) onLost(); });
  client.on("end", () => { if (!closing) onLost(); });
  try {
    await client.connect();
    const result = await client.query<{ acquired: boolean }>("SELECT pg_try_advisory_lock($1) AS acquired", [SYNC_LOCK_KEY]);
    if (!result.rows[0]?.acquired) { closing = true; await client.end(); return null; }
  } catch {
    closing = true;
    await client.end().catch(() => {});
    throw new Error("Sync database lock unavailable");
  }
  const heartbeat = setInterval(() => {
    client.query("SELECT 1").catch(() => { if (!closing) onLost(); });
  }, 15_000);
  heartbeat.unref();
  return async () => {
    closing = true;
    clearInterval(heartbeat);
    // PostgreSQL releases the advisory lock when its owning session ends.
    await client.end().catch(() => {});
  };
}
