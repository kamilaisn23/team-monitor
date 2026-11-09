import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseDir =
  process.env.EMBEDDED_PGDATA || path.join(root, ".pgdata");
const port = Number(process.env.EMBEDDED_PGPORT || 5432);
const user = process.env.POSTGRES_USER || "postgres";
const password = process.env.POSTGRES_PASSWORD || "postgres";
const database = process.env.POSTGRES_DB || "team_monitor";

const pg = new EmbeddedPostgres({
  databaseDir,
  port,
  user,
  password,
  persistent: true,
  autoRehydrateSymlinks: true,
});

if (!fs.existsSync(path.join(databaseDir, "PG_VERSION"))) {
  console.log(`[dev-db] initialising cluster at ${databaseDir}`);
  await pg.initialise();
}

await pg.start();
console.log(`[dev-db] PostgreSQL listening on 127.0.0.1:${port}`);

const client = pg.getPgClient();
await client.connect();
try {
  const { rows } = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [database],
  );
  if (!rows.length) {
    await pg.createDatabase(database);
    console.log(`[dev-db] created database ${database}`);
  }
} finally {
  await client.end();
}

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  try {
    await pg.stop();
  } finally {
    process.exit(0);
  }
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", () => {
  if (!stopping && pg) pg.stop().catch(() => {});
});

await new Promise(() => {});
