import { cp, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
const standalone = path.join(root, ".next", "standalone");
await mkdir(path.join(standalone, ".next"), { recursive: true });
await cp(path.join(root, "public"), path.join(standalone, "public"), {
  recursive: true,
});
await cp(
  path.join(root, ".next", "static"),
  path.join(standalone, ".next", "static"),
  { recursive: true },
);
const server = spawn(process.execPath, [path.join(standalone, "server.js")], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    HOSTNAME: "0.0.0.0",
    PORT: process.env.PORT || "3000",
    SYNC_MANAGER_PATH: process.env.SYNC_MANAGER_PATH || path.join(root, "scripts-dist/sync-manager.js"),
    SYNC_WORKER_PATH: process.env.SYNC_WORKER_PATH || path.join(root, "scripts-dist/sync-worker.js"),
  },
});
process.on("SIGINT", () => server.kill());
process.on("SIGTERM", () => server.kill());
server.on("exit", (code) => {
  process.exitCode = code || 0;
});
