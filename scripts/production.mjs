import { spawn } from "node:child_process";

// Docker entry point supervises web + scheduler in the same deployment.
// A failed child restarts the whole container; it cannot silently lose scheduling.
const children = [spawn(process.execPath, ["server.js"], { stdio: "inherit" }),
  spawn(process.execPath, ["scripts/sync-cron.js"], { stdio: "inherit" })];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  const timeout = setTimeout(() => process.exit(code), 5_000);
  timeout.unref();
  Promise.all(children.map(child => child.exitCode !== null ? Promise.resolve() : new Promise(resolve => child.once("exit", resolve))))
    .then(() => process.exit(code));
}
for (const child of children) {
  child.on("error", () => stop(1));
  child.on("exit", () => { if (!stopping) stop(1); });
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
