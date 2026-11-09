import { spawn } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FRONTEND_PORT = process.env.FRONTEND_PORT || "3000";
const PORT = process.env.PORT || "3001";
const DB_PORT = Number(process.env.EMBEDDED_PGPORT || 5432);

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    const done = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(1000);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}
const workerBuild = spawn(process.execPath, [path.join(root, "scripts/build-worker.mjs")], {
  cwd: root,
  stdio: "inherit",
});
await new Promise((resolve, reject) => {
  workerBuild.on("error", reject);
  workerBuild.on("exit", (code) => code === 0 ? resolve() : reject(new Error("Sync worker build failed.")));
});
const dbChildren = [];
if (process.env.DEV_DB !== "off" && !(await isPortOpen(DB_PORT))) {
  console.log("[dev] starting embedded PostgreSQL...");
  const db = spawn(
    process.execPath,
    [path.join(root, "scripts/dev-db.mjs")],
    { cwd: root, stdio: "inherit" },
  );
  dbChildren.push(db);
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline && !(await isPortOpen(DB_PORT))) {
    if (db.exitCode !== null) {
      throw new Error("Embedded PostgreSQL failed to start.");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
const serverEnv = {
  ...process.env,
  SYNC_MANAGER_PATH: process.env.SYNC_MANAGER_PATH || path.join(root, "scripts-dist/sync-manager.js"),
  SYNC_WORKER_PATH: process.env.SYNC_WORKER_PATH || path.join(root, "scripts-dist/sync-worker.js"),
};
const children = [
  ...dbChildren,
  spawn(
    process.execPath,
    [
      path.join(root, "node_modules/next/dist/bin/next"),
      "dev",
      "--webpack",
      "--port",
      PORT,
    ],
    { cwd: root, stdio: "inherit", env: serverEnv },
  ),
  spawn(
    process.execPath,
    [
      path.join(root, "node_modules/vite/bin/vite.js"),
      "--config",
      "frontend/vite.config.ts",
      "--port",
      FRONTEND_PORT,
      "--host",
      "0.0.0.0",
    ],
    { cwd: root, stdio: "inherit", env: { ...process.env, VITE_API_TARGET: `http://127.0.0.1:${PORT}` } },
  ),
];
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!closing) stop(code || 0);
  });
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
