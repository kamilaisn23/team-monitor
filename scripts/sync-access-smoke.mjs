import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let session = null, calls = 0, created = 0, running = false, cooldown = 0;
const doneJob = { status: "done", events: [{ type: "done" }], listeners: [] };
const manager = {
  createSyncJob(source) { created++; return `job-${source}`; },
  getJob(id) { return id === "done" ? doneJob : undefined; },
  isJobRunning() { return running; },
  getCooldownSecondsRemaining() { return cooldown; },
};
globalThis.__syncAccessAuth = async () => session;
const result = await build({
  entryPoints: ["src/app/api/sync/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external",
  plugins: [{ name: "auth-fixture", setup(builder) {
    builder.onResolve({ filter: /^@\/lib\/auth$/ }, () => ({ path: "auth", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: "export const auth = globalThis.__syncAccessAuth;", loader: "js" }));
  } }],
});
const module = { exports: {} };
process.env.SYNC_MANAGER_PATH = "fixture-sync-manager";
new Function("require", "module", "exports", result.outputFiles[0].text)((name) => {
  if (name === "fixture-sync-manager") { calls++; return manager; }
  return require(name);
}, module, module.exports);
const request = (query = "") => new Request("http://localhost/api/sync?" + query);
for (const denied of [null, ...["UNASSIGNED", "DEVELOPER", "MANAGER", "SUPERADMIN"].map(role => ({ user: { role, isSuperadmin: false } }))]) {
  session = denied;
  for (const [method, query] of [["POST", "source=all"], ["GET", ""], ["GET", "jobId=done"]]) {
    const response = await module.exports[method](request(query));
    assert.equal(response.status, denied ? 403 : 401);
    assert.ok(response.headers.get("content-type").includes("application/json"));
    assert.equal((await response.json()).error, denied ? "Forbidden" : "Unauthorized");
  }
}
assert.equal(calls, 0, "Denied requests must not load the manager or touch jobs");
assert.equal(created, 0);
for (const allowed of [{ user: { role: "ADMIN", isSuperadmin: false } }, { user: { role: "SUPERADMIN", isSuperadmin: true } }]) {
  session = allowed;
  for (const source of ["all", "github", "gitlab", "kerjabaik"]) {
    const response = await module.exports.POST(request("source=" + source));
    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), { jobId: "job-" + source, source });
  }
  const status = await module.exports.GET(request());
  assert.equal(status.status, 200);
  assert.deepEqual(await status.json(), { running: false, cooldownSecondsRemaining: 0 });
  const stream = await module.exports.GET(request("jobId=done"));
  assert.equal(stream.headers.get("content-type"), "text/event-stream");
  assert.ok((await stream.text()).includes('"type":"done"'));
}
const beforeInvalid = calls;
assert.equal((await module.exports.POST(request("source=unknown"))).status, 400);
assert.equal(calls, beforeInvalid);
running = true;
assert.equal((await module.exports.POST(request())).status, 409);
running = false; cooldown = 120;
const rateLimited = await module.exports.POST(request());
assert.equal(rateLimited.status, 429);
assert.equal(rateLimited.headers.get("retry-after"), "120");
assert.equal(created, 8, "Busy/cooldown/invalid requests must not create jobs");
assert.equal((await module.exports.GET(request("jobId=missing"))).status, 404);
console.log("Sync access checks passed: role matrix, no side effects on denial, status/SSE permissions, sources, cooldown and JSON errors.");
