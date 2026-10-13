import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workerBuild = spawn(process.execPath, [path.join(root, "scripts/build-worker.mjs")], {
  cwd: root,
  stdio: "inherit",
});
await new Promise((resolve, reject) => {
  workerBuild.on("error", reject);
  workerBuild.on("exit", (code) => code === 0 ? resolve() : reject(new Error("Sync worker build failed.")));
});
const serverEnv = {
  ...process.env,
  SYNC_MANAGER_PATH: process.env.SYNC_MANAGER_PATH || path.join(root, "scripts-dist/sync-manager.js"),
  SYNC_WORKER_PATH: process.env.SYNC_WORKER_PATH || path.join(root, "scripts-dist/sync-worker.js"),
};
const children = [
  spawn(
    process.execPath,
    [
      path.join(root, "node_modules/next/dist/bin/next"),
      "dev",
      "--webpack",
      "--port",
      "3001",
    ],
    { cwd: root, stdio: "inherit", env: serverEnv },
  ),
  spawn(
    process.execPath,
    [
      path.join(root, "node_modules/vite/bin/vite.js"),
      "--config",
      "frontend/vite.config.ts",
    ],
    { cwd: root, stdio: "inherit" },
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
