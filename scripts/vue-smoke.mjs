import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs/promises";
import { JSDOM } from "jsdom";
import { build } from "esbuild";
import { parse, compileScript } from "@vue/compiler-sfc";

const root = process.cwd();
const dom = new JSDOM(
  '<!doctype html><html><body><div id="app"></div></body></html>',
  { url: "http://localhost:3000/preview", pretendToBeVisual: true },
);
for (const key of [
  "window",
  "document",
  "Document",
  "ShadowRoot",
  "navigator",
  "history",
  "location",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLDialogElement",
  "SVGElement",
  "Element",
  "Node",
  "Event",
  "MouseEvent",
  "MutationObserver",
])
  Object.defineProperty(globalThis, key, {
    value: dom.window[key],
    configurable: true,
  });
window.scrollTo = () => {};
globalThis.requestAnimationFrame = (callback) =>
  setTimeout(() => callback(Date.now()), 0);
globalThis.cancelAnimationFrame = clearTimeout;
HTMLElement.prototype.scrollIntoView = function () {};
HTMLElement.prototype.scrollTo = function () {};
HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
const requests = [];
let live = false;
let failDashboardIssues = false;
let failFollowUp = false;
let liveFollowUp = { status: 'unreviewed', note: '', ownerId: null, revision: null, updatedAt: null, updatedBy: null };
const liveTeams = [
  { id: "t1", name: "Product", memberCount: 1 },
  { id: "t2", name: "Platform", memberCount: 0 },
];
const liveMember = {
  id: "m1",
  name: "Test Member",
  role: "DEVELOPER",
  isActive: true,
  avatarUrl: null,
  usernameGithub: "tester",
  usernameGitlab: null,
  teams: [liveTeams[0]],
};
const liveRepo = {
  id: "r1",
  name: "team/test",
  platform: "GITHUB",
  ignored: false,
  url: "https://github.com/team/test",
  teams: [liveTeams[0]],
};
globalThis.fetch = async (url, options = {}) => {
  requests.push({
    url: String(url),
    method: options.method || "GET",
    body: options.body,
  });
  if (String(url) === "/api/ui-config")
    return Response.json({ githubConfigured: false, kerjabaikEnabled: false });
  if (String(url) === "/api/auth/session") return Response.json(null);
  if (String(url) === "/test-delete")
    return new Response(null, { status: 204 });
  if (live) {
    const pathname = String(url).split("?")[0];
    if (options.method === "DELETE") return new Response(null, { status: 204 });
    if (options.method && options.method !== "GET") {
      if (pathname === '/api/dashboard/attention/live-issue') {
        if (failFollowUp) return Response.json({ error: 'Tindak lanjut telah diubah pengguna lain.' }, { status: 409 });
        const payload = JSON.parse(options.body);
        liveFollowUp = { status: payload.status, note: payload.note, ownerId: payload.ownerId, revision: 'live-revision', updatedAt: new Date().toISOString(), updatedBy: 'Admin Test' };
        return Response.json(liveFollowUp);
      }
      if (pathname === "/api/settings")
        return Response.json(JSON.parse(options.body));
      if (pathname === "/api/members/m1")
        return Response.json({ ...liveMember, ...JSON.parse(options.body) });
      if (pathname === "/api/repositories/r1") return Response.json(liveRepo);
      if (pathname === "/api/teams")
        return Response.json(
          { id: "t3", ...JSON.parse(options.body) },
          { status: 201 },
        );
      if (pathname.match(/^\/api\/teams\/[^/]+\/members$/))
        return Response.json(
          { teamId: pathname.split("/")[3], memberId: "m1" },
          { status: 201 },
        );
    }
    if (pathname === "/api/teams") return Response.json(liveTeams);
    if (pathname === "/api/repositories") return Response.json([liveRepo]);
    if (pathname === "/api/members") return Response.json([liveMember]);
    if (pathname === "/api/members/m1") return Response.json(liveMember);
    if (pathname === "/api/settings")
      return Response.json({ lowMax: 3, mediumMax: 7, staleDays: 30 });
    if (pathname === "/api/sync/status")
      return Response.json({ lastSyncedAt: null });
    if (pathname.endsWith("/stats"))
      return Response.json({
        currentLoad: 2,
        issuesCreated: 3,
        issuesAssigned: 4,
        issuesResolved: 5,
        staleIssues: 1,
        staleDays: 30,
      });
    if (pathname.endsWith("/timeline")) return Response.json({ records: [] });
    if (pathname.endsWith("/repositories")) return Response.json([]);
    if (pathname.endsWith("/issues"))
      return Response.json({ data: [], total: 0, page: 1, limit: 20 });
    if (pathname === "/api/reports/monthly")
      return Response.json({
        data: [],
        total: 0,
        totals: {
          issuesCreated: 0,
          issuesAssigned: 0,
          issuesResolved: 0,
          issuesStillOpen: 0,
        },
      });
    if (pathname === '/api/dashboard/attention') {
      const params = new URL(String(url), 'http://localhost').searchParams;
      const data = params.get('status') === 'all' || params.get('status') === liveFollowUp.status ? [{
        id: 'live-issue', title: 'Live issue needing review', url: 'https://github.com/team/test/issues/1',
        createdAt: new Date(Date.now() - 45 * 86400000).toISOString(), ageDays: 45,
        repository: { id: 'r1', name: 'team/test', platform: 'github' }, assignees: [{ memberId: 'm1', name: 'Test Member' }],
        reasons: ['stale'], followUp: liveFollowUp,
      }] : [];
      return Response.json({ data, total: data.length, page: 1, limit: 10, counts: { unreviewed: Number(liveFollowUp.status === 'unreviewed'), following_up: Number(liveFollowUp.status === 'following_up'), reviewed: Number(liveFollowUp.status === 'reviewed') }, owners: [{ id: 'm1', name: 'Test Member' }], staleDays: 30 });
    }
    if (pathname === "/api/dashboard" && new URL(String(url), 'http://localhost').searchParams.has('issueView')) {
      if (failDashboardIssues) return Response.json({ error: 'Daftar isu gagal dimuat' }, { status: 503 });
      return Response.json({ data: [{
        id: 'live-issue', title: 'Live issue needing review', url: 'https://github.com/team/test/issues/1',
        createdAt: new Date(Date.now() - 45 * 86400000).toISOString(), ageDays: 45,
        repository: { id: 'r1', name: 'team/test', platform: 'github' },
        assignees: [{ memberId: 'm1', name: 'Test Member' }],
      }], total: 1, page: 1, limit: 20 });
    }
    if (pathname === "/api/dashboard")
      return Response.json({
        data: [],
        total: 0,
        summary: {
          memberCount: 0,
          activeMembers: 0,
          totalOpenIssues: 0,
          highWorkload: 0,
          staleIssues: 0,
          resolvedLast7Days: 0,
          distribution: { low: 0, medium: 0, high: 0 },
        },
        thresholds: { lowMax: 3, mediumMax: 7, staleDays: 30 },
        attentionIssues: [],
        teamOverview: [],
      });
  }
  throw new Error("Unexpected request: " + url);
};
const result = await build({
  stdin: {
    contents: `export { default as App } from './frontend/src/App.vue'; export { default as router } from './frontend/src/router'; export { workspace } from './frontend/src/state'; export { api } from './frontend/src/api';`,
    resolveDir: root,
  },
  bundle: true,
  write: false,
  format: "cjs",
  platform: "node",
  packages: "external",
  plugins: [
    {
      name: "vue-sfc",
      setup(builder) {
        builder.onLoad({ filter: /\.vue$/ }, async ({ path: filename }) => {
          const { descriptor } = parse(await fs.readFile(filename, "utf8"), {
            filename,
          });
          const script = compileScript(descriptor, {
            id: filename,
            inlineTemplate: true,
          });
          return {
            contents: script.content,
            loader: "ts",
            resolveDir: path.dirname(filename),
          };
        });
      },
    },
  ],
});
const require = createRequire(import.meta.url);
const module = { exports: {} };
new Function("require", "module", "exports", result.outputFiles[0].text)(
  require,
  module,
  module.exports,
);
const { App, router, workspace, api } = module.exports;
const { createApp, nextTick } = require("vue");
const app = createApp(App).use(router);
await router.push("/preview");
await router.isReady();
app.mount("#app");
async function settle() {
  // Drain microtasks and queued macrotasks (fetch mocks, router guards and
  // page transitions) instead of sleeping on a fixed wall-clock delay, which
  // races under CPU load and makes the suite flaky.
  for (let i = 0; i < 8; i++) {
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  await nextTick();
}
async function click(label) {
  const element = [...document.querySelectorAll("button")].find(
    (button) => button.getAttribute("aria-label") === label,
  );
  assert.ok(element, "Missing button: " + label);
  assert.equal(element.disabled, false, label);
  element.click();
  await settle();
}
async function textClick(label) {
  const element = [...document.querySelectorAll("button")].find(
    (button) => button.textContent.trim() === label,
  );
  assert.ok(element, "Missing button text: " + label);
  element.click();
  await settle();
}
async function navigate(section) {
  await router.push(
    "/preview" + (section === "dashboard" ? "" : "?section=" + section),
  );
  await settle();
}
async function input(selector, value) {
  const element = document.querySelector(selector);
  assert.ok(element, selector);
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
}
async function select(selector, value) {
  const element = document.querySelector(selector);
  assert.ok(element, selector);
  element.value = value;
  element.dispatchEvent(new Event('change', { bubbles: true }));
  await settle();
}
await settle();
assert.equal(document.querySelector('.sidebar-collapse').textContent.trim(), '');
assert.equal(document.querySelector('.sync-button').disabled, true, 'Preview sync remains disabled');
await click('Ringkas sidebar');
assert.equal(document.querySelector('.sidebar-collapse').title, 'Perluas sidebar');
await click('Perluas sidebar');
assert.equal(document.querySelectorAll('.weekly-chart-column').length, 4);
await click('Simpan filter dashboard');
await input('dialog form input', 'Pantauan harian');
document.querySelector('dialog form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
await settle();
assert.ok(window.localStorage.getItem('team-monitor:dashboard-filters:v1:preview').includes('Pantauan harian'));
await click('Lihat detail beban tinggi');
assert.equal(document.querySelectorAll('.data-table tbody tr').length, 2);
await click('Terapkan filter Pantauan harian');
assert.equal(document.querySelectorAll('.data-table tbody tr').length, 10);
await click('Buka pusat perhatian tim');
assert.equal(document.querySelectorAll('.attention-card').length, 10);
document.querySelector('dialog button[aria-label="Halaman berikutnya"]').click();
await settle();
assert.equal(document.querySelectorAll('.attention-card').length, 5);
document.querySelector('dialog button[aria-label="Halaman sebelumnya"]').click();
await settle();
document.querySelector('.attention-follow-up-summary button').click();
await settle();
await input('.attention-editor textarea', 'Diskusikan prioritas pada rapat tim.');
await select('.attention-editor select', 'reviewed');
await select('.attention-editor .follow-up-fields label:nth-child(2) select', 'demo-member-1');
await textClick('Simpan tindak lanjut');
const previewRecord = JSON.parse(window.localStorage.getItem('team-monitor:preview-attention:v1'));
assert.equal(Object.values(previewRecord)[0].status, 'reviewed');
assert.equal(Object.values(previewRecord)[0].ownerId, 'demo-member-1');
const reviewedTab = [...document.querySelectorAll('.attention-status-tabs button')].find((button) => button.textContent.includes('Sudah ditinjau'));
reviewedTab.click(); await settle();
assert.equal(document.querySelectorAll('.attention-card').length, 1);
assert.ok(document.querySelector('.attention-note').textContent.includes('Diskusikan prioritas'));
await click('Tutup detail');
await click('Buka pusat perhatian tim');
assert.ok([...document.querySelectorAll('.attention-status-tabs button')].find((button) => button.textContent.includes('Sudah ditinjau')).textContent.includes('1'));
await select('.attention-reason select', 'unassigned');
assert.equal(document.querySelectorAll('.attention-card').length, 4);
await click('Tutup detail');
assert.equal(document.querySelectorAll(".workspace-sidebar nav a").length, 6);
assert.equal(document.querySelectorAll(".metric-card").length, 4);
assert.ok(document.querySelector('.manager-brief').textContent.includes('12 isu selesai'));
assert.equal(document.querySelectorAll('.brief-attention-item').length, 3);
assert.ok(document.querySelector('.brief-attention-note').textContent.includes('bukan sejak aktivitas terakhir'));
await click('Tinjau semua isu mengendap');
assert.equal(document.querySelectorAll('dialog .issue-row').length, 11);
document.querySelector('dialog .issue-row').click();
await settle();
assert.ok(document.querySelector('dialog').textContent.includes('Aditya'));
await click('Tutup detail');
await click('Tinjau anggota dengan beban tinggi');
assert.equal(document.querySelectorAll('.data-table tbody tr').length, 2);
await textClick('Semua');
assert.equal(document.querySelectorAll('.data-table tbody tr').length, 10);
assert.equal(document.querySelectorAll(".data-table tbody tr").length, 10);
await click("Halaman berikutnya");
assert.equal(document.querySelectorAll(".data-table tbody tr").length, 2);
await click("Lihat detail beban tinggi");
assert.equal(document.querySelectorAll(".data-table tbody tr").length, 2);
await click("Lihat detail isu terbuka");
assert.equal(document.querySelectorAll("dialog .issue-row").length, 20);
document.querySelector('dialog button[aria-label="Halaman berikutnya"]').click();
await settle();
assert.equal(document.querySelectorAll("dialog .issue-row").length, 20);
document.querySelector('dialog button[aria-label="Halaman berikutnya"]').click();
await settle();
assert.equal(document.querySelectorAll("dialog .issue-row").length, 11);
await click("Tutup detail");
await click("Lihat detail isu mengendap");
assert.equal(document.querySelectorAll("dialog .issue-row").length, 11);
await click("Tutup detail");
await click("Lihat detail kapasitas tim");
assert.equal(document.querySelectorAll("dialog .detail-row").length, 3);
await click("Tutup detail");
await click("Tampilan kartu");
assert.equal(document.querySelectorAll(".member-grid > button").length, 2);
document.querySelector(".member-grid > button").click();
await settle();
assert.ok(document.querySelector("dialog").textContent.includes("Aditya"));
assert.equal(document.querySelectorAll("dialog .issue-row").length, 10);
await click("Tutup detail");
await navigate("members");
assert.equal(document.querySelectorAll(".member-grid article").length, 12);
await input('input[aria-label="Cari anggota"]', "Sarah");
assert.equal(document.querySelectorAll(".member-grid article").length, 1);
await click("Tampilan tabel");
assert.equal(document.querySelectorAll(".data-table tbody tr").length, 1);
await navigate("teams");
assert.equal(document.querySelectorAll(".team-card").length, 3);
await click("Buka dasbor Product Engineering");
assert.equal(workspace.teamId, "demo-product");
assert.equal(router.currentRoute.value.fullPath, "/preview");
assert.equal(document.querySelectorAll(".data-table tbody tr").length, 4);
assert.ok(document.querySelector('[aria-label="Terapkan filter Pantauan harian"]'), 'Favorite persists when returning to dashboard');
workspace.teamId = "";
await navigate("repositories");
assert.equal(document.querySelectorAll(".data-table tbody tr").length, 4);
await click("Lihat detail github");
assert.equal(document.querySelectorAll(".data-table tbody tr").length, 2);
assert.ok(
  document.querySelector(".data-table").textContent.includes("portal-web"),
);
await click("Lihat detail gitlab");
assert.equal(document.querySelectorAll(".data-table tbody tr").length, 2);
assert.ok(
  document.querySelector(".data-table").textContent.includes("platform-api"),
);
await navigate("reports");
assert.equal(document.querySelectorAll(".data-table tbody tr").length, 10);
await textClick("Per tim");
assert.equal(document.querySelectorAll(".report-groups details").length, 3);
await navigate("settings");
document.querySelectorAll(".simulation-bands button")[2].click();
await settle();
assert.equal(document.querySelectorAll("dialog .detail-row").length, 2);
await click("Tutup detail");
await input("#medium-max", "10");
document.querySelectorAll(".simulation-bands button")[2].click();
await settle();
assert.equal(document.querySelectorAll("dialog .detail-row").length, 0);
await click("Tutup detail");
assert.equal(
  requests.length,
  0,
  "Preview does not contact private APIs or make writes.",
);
assert.equal(
  [...document.querySelectorAll("button")].some((button) =>
    button.querySelector("button,a,input,select"),
  ),
  false,
  "No nested interactive controls.",
);
window.innerWidth = 390;
await navigate("dashboard");
assert.ok(document.querySelector(".member-grid"));
assert.equal(document.querySelector(".data-table"), null);
await router.push("/admin/settings");
await settle();
assert.equal(
  router.currentRoute.value.path,
  "/login",
  "Unauthenticated private routes redirect.",
);
assert.equal(
  document.querySelector(".login-submit").disabled,
  true,
  "Placeholder OAuth cannot start login.",
);
await api("/test-delete", { method: "DELETE" });
assert.ok(requests.some((request) => request.url === "/test-delete"));
live = true;
workspace.session = {
  user: { name: "Admin Test", role: "ADMIN", isSuperadmin: false },
};
await router.push("/admin/members/m1/edit");
await settle();
assert.equal(document.querySelector('input[value="t1"]').checked, true);
document.querySelector('input[value="t1"]').click();
await settle();
document.querySelector('input[value="t2"]').click();
await settle();
document
  .querySelector(".edit-form")
  .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
await settle();
assert.ok(
  requests.some(
    (request) =>
      request.url === "/api/members/m1" && request.method === "PATCH",
  ),
);
assert.ok(
  requests.some(
    (request) =>
      request.url === "/api/teams/t2/members" &&
      request.method === "POST" &&
      JSON.parse(request.body).memberId === "m1",
  ),
);
assert.ok(
  requests.some(
    (request) =>
      request.url === "/api/teams/t1/members/m1" && request.method === "DELETE",
  ),
);
assert.equal(router.currentRoute.value.path, "/admin/members");
workspace.config.kerjabaikEnabled = true;
await settle();
assert.equal(
  document.querySelector('a[href="/admin/members/new"]'),
  null,
  "Externally managed data hides write controls.",
);
workspace.config.kerjabaikEnabled = false;
await router.push("/admin/repositories");
await settle();
await click("Atur repositori team/test");
document.querySelector('dialog input[type="checkbox"]').click();
await settle();
document.querySelector('dialog input[value="t1"]').click();
await settle();
document.querySelector('dialog input[value="t2"]').click();
await settle();
document
  .querySelector("dialog form")
  .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
await settle();
const repoWrite = requests.find(
  (request) =>
    request.url === "/api/repositories/r1" && request.method === "PATCH",
);
assert.deepEqual(JSON.parse(repoWrite.body), {
  teamIds: ["t2"],
  ignored: true,
});
await router.push("/admin/settings");
await settle();
assert.equal(
  router.currentRoute.value.path,
  "/dashboard",
  "Ordinary admin cannot open superadmin settings.",
);
assert.ok(document.querySelector('.manager-brief').textContent.includes('Belum ada anggota'));
assert.ok(document.querySelector('.sync-button'), 'Admin has the manual sync control');
for (const role of ['MANAGER', 'DEVELOPER', 'UNASSIGNED']) {
  workspace.session.user.role = role;
  await settle();
  assert.equal(document.querySelector('.sync-button'), null, role + ' cannot see the manual sync control');
}
workspace.session.user.role = 'ADMIN';
await settle();
assert.equal(document.querySelector('[aria-label="Terapkan filter Pantauan harian"]'), null, 'Preview favorites are isolated from live accounts');
await click('Buka pusat perhatian tim');
document.querySelector('.attention-follow-up-summary button').click(); await settle();
await input('.attention-editor textarea', 'Periksa bersama pemilik repositori.');
await select('.attention-editor select', 'following_up');
await select('.attention-editor .follow-up-fields label:nth-child(2) select', 'm1');
failFollowUp = true;
await textClick('Simpan tindak lanjut');
assert.ok(document.querySelector('.attention-editor [role="alert"]').textContent.includes('diubah pengguna lain'));
assert.equal(document.querySelector('.attention-editor textarea').value, 'Periksa bersama pemilik repositori.', 'Failed writes retain the draft');
failFollowUp = false;
await textClick('Simpan tindak lanjut');
const followUpWrite = requests.filter((request) => request.method === 'PATCH' && request.url === '/api/dashboard/attention/live-issue').at(-1);
assert.deepEqual(JSON.parse(followUpWrite.body), { status: 'following_up', note: 'Periksa bersama pemilik repositori.', ownerId: 'm1', expectedRevision: null });
await click('Tutup detail');
assert.equal(document.querySelector('[aria-label="Tinjau semua isu mengendap"]').disabled, true);
await click('Lihat detail isu mengendap');
assert.equal(document.querySelector('dialog .issue-row').tagName, 'A');
assert.equal(document.querySelector('dialog .issue-row').href, 'https://github.com/team/test/issues/1');
assert.equal(document.querySelector('dialog .issue-row').target, '_blank');
assert.ok(document.querySelector('dialog .issue-row').rel.includes('noopener'));
assert.ok(requests.some((request) => request.url.startsWith('/api/dashboard?') && request.url.includes('issueView=stale')));
await click('Tutup detail');
failDashboardIssues = true;
await click('Lihat detail isu mengendap');
assert.ok(document.querySelector('dialog [role="alert"]').textContent.includes('Daftar isu gagal dimuat'));
assert.equal(document.querySelector('dialog .issue-row'), null);
failDashboardIssues = false;
document.querySelector('dialog [role="alert"] button').click();
await settle();
assert.equal(document.querySelector('dialog [role="alert"]'), null);
assert.ok(document.querySelector('dialog .issue-row'));
await click('Tutup detail');
workspace.session.user.isSuperadmin = true;
await router.push("/admin/settings");
await settle();
await input("#low-max", "4");
await input("#medium-max", "9");
await input("#stale-days", "40");
await textClick("Simpan perubahan");
const settingsWrite = requests.find(
  (request) => request.url === "/api/settings" && request.method === "PATCH",
);
assert.deepEqual(JSON.parse(settingsWrite.body), {
  lowMax: 4,
  mediumMax: 9,
  staleDays: 40,
});
await router.push("/members/m1");
await settle();
await click("Lihat detail mengendap");
const staleRequest = requests
  .filter((request) => request.url.startsWith("/api/members/m1/issues?"))
  .at(-1);
const staleParams = new URL(staleRequest.url, "http://localhost").searchParams;
assert.equal(staleParams.get("stale"), "true");
assert.equal(staleParams.get("state"), "open");
assert.equal(staleParams.has("days"), false);
await click("Lihat detail selesai");
const resolvedRequest = requests
  .filter((request) => request.url.startsWith("/api/members/m1/issues?"))
  .at(-1);
const resolvedParams = new URL(resolvedRequest.url, "http://localhost")
  .searchParams;
assert.equal(resolvedParams.get("state"), "closed");
assert.equal(resolvedParams.get("days"), "90");
workspace.session.user.role = 'DEVELOPER';
workspace.session.user.isSuperadmin = false;
workspace.session.user.id = 'm1';
const beforeOtherProfile = requests.length;
await router.push('/members/other-member');
await settle();
assert.equal(router.currentRoute.value.path, '/members/m1', 'Developer routes to own profile');
assert.ok(!requests.slice(beforeOtherProfile).some(request => request.url.includes('/api/members/other-member')));
await router.push('/dashboard');
await settle();
assert.ok(document.querySelector('.info-banner').textContent.includes('data pribadi'));
assert.equal(document.querySelector('.sync-button'), null);
assert.equal(document.querySelector('[aria-label="Buka pusat perhatian tim"]'), null);
await router.push('/reports');
await settle();
assert.ok(document.querySelector('.page-heading').textContent.includes('laporan Anda'));
app.unmount();
dom.window.close();
console.log(
  "Vue checks passed: six preview views, interaction/filter/pagination/mobile behavior, demo isolation, auth gates, disabled OAuth, member/membership edits, repository controls, settings writes, managed-data restrictions, profile periods/stale filters and 204 responses.",
);
