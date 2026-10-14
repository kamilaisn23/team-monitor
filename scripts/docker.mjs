import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import net from "node:net";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(root, ".env.docker");
const backupPath = path.join(root, ".local-docker", "team-monitor.dump");
const readEnv = (filename) => fs.existsSync(path.join(root, filename))
  ? dotenv.parse(fs.readFileSync(path.join(root, filename))) : {};
const dockerArgs = ["compose", "--env-file", ".env.docker"];

function docker(args, options = {}) {
  const result = spawnSync("docker", args, { cwd: root, windowsHide: true, stdio: "inherit", ...options });
  if (result.error || result.status !== 0) throw new Error("Docker command failed. Check Docker Desktop and the command output.");
  return result.stdout;
}

function prepare() {
  const local = { ...readEnv(".env"), ...readEnv(".env.local") };
  const previous = readEnv(".env.docker");
  const env = {
    ...local, ...previous,
    COMPOSE_PROJECT_NAME: previous.COMPOSE_PROJECT_NAME || "team-monitor",
    APP_ENV_FILE: ".env.docker",
    APP_BIND_HOST: previous.APP_BIND_HOST || "127.0.0.1",
    APP_PORT: previous.APP_PORT || "3000",
    POSTGRES_PORT: previous.POSTGRES_PORT || "5434",
    POSTGRES_DB: previous.POSTGRES_DB || "team_monitor",
    POSTGRES_USER: previous.POSTGRES_USER || "team_monitor",
    POSTGRES_PASSWORD: previous.POSTGRES_PASSWORD || crypto.randomBytes(24).toString("base64url"),
    AUTH_SECRET: previous.AUTH_SECRET || local.AUTH_SECRET || crypto.randomBytes(32).toString("base64url"),
    AUTH_TRUST_HOST: "true",
  };
  for (const name of ["APP_PORT", "POSTGRES_PORT"]) {
    if (!/^\d+$/.test(env[name]) || Number(env[name]) < 1 || Number(env[name]) > 65535) throw new Error(`Invalid ${name}.`);
  }
  for (const name of ["POSTGRES_USER", "POSTGRES_DB"]) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(env[name])) throw new Error(`Invalid ${name}.`);
  }
  env.DOCKER_DATABASE_URL = `postgresql://${encodeURIComponent(env.POSTGRES_USER)}:${encodeURIComponent(env.POSTGRES_PASSWORD)}@db:5432/${env.POSTGRES_DB}`;
  env.DATABASE_URL = env.DOCKER_DATABASE_URL;
  env.NEXTAUTH_URL = previous.NEXTAUTH_URL || `http://localhost:${env.APP_PORT}`;
  const quote = (value) => "'" + String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'") + "'";
  fs.writeFileSync(configPath, "# Local Docker configuration. Contains secrets; do not commit.\n" +
    Object.entries(env).map(([key, value]) => `${key}=${quote(value)}`).join("\n") + "\n", { mode: 0o600 });
  console.log(`Docker configuration prepared: app port ${env.APP_PORT}, PostgreSQL port ${env.POSTGRES_PORT}.`);
  // Copy data only through a dump; the running local database is left intact.
  if (!fs.existsSync(backupPath) && local.DATABASE_URL) {
    const source = new URL(local.DATABASE_URL);
    const bundledDump = process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA,
      "TeamMonitor", "postgres-runtime", "node_modules", "@embedded-postgres", "windows-x64", "native", "bin", "pg_dump.exe");
    if (["127.0.0.1", "localhost"].includes(source.hostname) && bundledDump && fs.existsSync(bundledDump)) {
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      const result = spawnSync(bundledDump, ["--format=custom", "--no-owner", "--no-acl", "--file", backupPath], {
        windowsHide: true, timeout: 30000, encoding: "utf8",
        env: { ...process.env, PGHOST: source.hostname, PGPORT: source.port || "5432",
          PGUSER: decodeURIComponent(source.username), PGPASSWORD: decodeURIComponent(source.password),
          PGDATABASE: decodeURIComponent(source.pathname.slice(1)) },
      });
      if (result.error || result.status !== 0) throw new Error("Local database backup failed; check that PostgreSQL is running before Docker setup.");
      console.log("Local database backup saved for importing into an empty Docker database.");
    }
  }
  docker([...dockerArgs, "config", "--quiet"], { timeout: 15000 });
  console.log("Docker Compose configuration is valid.");
}

async function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port: Number(port) });
    const finish = (used) => { socket.destroy(); resolve(used); };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.setTimeout(1000, () => finish(false));
  });
}

async function restore(env) {
  if (!fs.existsSync(backupPath)) return;
  const tables = docker([...dockerArgs, "exec", "-T", "db", "psql", "-U", env.POSTGRES_USER, "-d", env.POSTGRES_DB,
    "-tAc", "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"],
    { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", timeout: 15000 });
  if (Number(tables.trim()) > 0) {
    console.log("Docker database already contains tables; existing data was preserved.");
    return;
  }
  await new Promise((resolve, reject) => {
    const child = spawn("docker", [...dockerArgs, "exec", "-T", "db", "pg_restore", "-U", env.POSTGRES_USER,
      "-d", env.POSTGRES_DB, "--no-owner", "--no-privileges", "--exit-on-error", "--single-transaction"],
      { cwd: root, windowsHide: true, stdio: ["pipe", "inherit", "inherit"] });
    const input = fs.createReadStream(backupPath);
    input.on("error", reject);
    child.on("error", reject);
    child.stdin.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error("Database import failed; the application was not started.")));
    input.pipe(child.stdin);
  });
  console.log("Local GitHub data imported into Docker.");
}

try {
  const action = process.argv[2] || "up";
  if (action === "prepare") prepare();
  else {
    if (!fs.existsSync(configPath)) prepare();
    if (action === "up") {
      const info = spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], { windowsHide: true, encoding: "utf8", timeout: 15000 });
      if (info.error || info.status !== 0) throw new Error("Docker Engine is not ready. Finish WSL setup, restart Windows if requested, and open Docker Desktop.");
      const env = readEnv(".env.docker");
      const state = docker([...dockerArgs, "ps", "--services", "--status", "running"], { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
      if (await portInUse(env.APP_PORT) && !state.split(/\r?\n/).includes("app")) throw new Error(`Port ${env.APP_PORT} is in use. Stop the local development server before starting Docker.`);
      docker([...dockerArgs, "build", "app", "sync"]);
      docker([...dockerArgs, "up", "-d", "--wait", "db"]);
      await restore(env);
      docker([...dockerArgs, "up", "-d", "--wait", "app", "sync"]);
      console.log(`Team Monitor is running in Docker at http://localhost:${env.APP_PORT}`);
    } else if (action === "down") docker([...dockerArgs, "down"]);
    else if (action === "status") docker([...dockerArgs, "ps"]);
    else throw new Error("Use prepare, up, down or status.");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
