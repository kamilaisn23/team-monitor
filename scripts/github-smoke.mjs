import assert from "node:assert/strict";
import { build } from "esbuild";

const keys = ["GITHUB_USER_NAME", "GITHUB_ORG_NAME", "GITHUB_TOKEN", "GITHUB_ORG_TOKEN"];
const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
try {
  for (const key of keys) delete process.env[key];
  const result = await build({ entryPoints: ["src/lib/github.ts"], bundle: true, write: false, platform: "node", format: "cjs" });
  const module = { exports: {} };
  new Function("module", "exports", result.outputFiles[0].text)(module, module.exports);
  const { githubIssueQueries, fetchGithubIssues } = module.exports;
  assert.deepEqual(githubIssueQueries("personal-owner"), ["user:personal-owner assignee:personal-owner is:issue", "user:personal-owner author:personal-owner is:issue"]);
  process.env.GITHUB_ORG_NAME = "team-org";
  assert.ok(githubIssueQueries("member").every((query) => query.startsWith("org:team-org ")));
  process.env.GITHUB_USER_NAME = "personal-owner";
  assert.ok(githubIssueQueries("member").every((query) => query.startsWith("user:personal-owner ")));
  assert.throws(() => githubIssueQueries("bad owner is:pr"), /Invalid GitHub/);
  const calls = [];
  const issue = (number) => ({ number, title: `Issue ${number}`, html_url: `https://github.com/personal-owner/project/issues/${number}` });
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(url);
    calls.push({ query: parsed.searchParams.get("q"), page: parsed.searchParams.get("page"), headers: options.headers });
    const items = parsed.searchParams.get("q").includes("author:")
      ? [issue(1), issue(102)]
      : parsed.searchParams.get("page") === "1"
        ? Array.from({ length: 100 }, (_, index) => issue(index + 1))
        : [issue(101)];
    return Response.json({ items, total_count: 102 });
  };
  assert.equal((await fetchGithubIssues("personal-owner")).length, 102, "Fetch all pages and deduplicate authored/assigned issues");
  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map((call) => call.page), ["1", "2", "1"]);
  assert.equal(calls[0].headers.Authorization, undefined, "Public repositories work without a token");
  process.env.GITHUB_ORG_TOKEN = "legacy-test-token";
  calls.length = 0;
  await fetchGithubIssues("personal-owner");
  assert.equal(calls[0].headers.Authorization, "Bearer legacy-test-token");
  process.env.GITHUB_TOKEN = "personal-test-token";
  calls.length = 0;
  await fetchGithubIssues("personal-owner");
  assert.equal(calls[0].headers.Authorization, "Bearer personal-test-token");
  for (const status of [401, 403, 422]) {
    let attempts = 0;
    globalThis.fetch = async () => { attempts++; return new Response(null, { status }); };
    await assert.rejects(() => fetchGithubIssues("personal-owner"), new RegExp(`HTTP ${status}`));
    assert.equal(attempts, 1, "Access/configuration errors must fail instead of reporting empty successful syncs or retrying indefinitely");
  }
  console.log("GitHub checks passed: personal/org scopes, public access, token compatibility, pagination, deduplication and API failures.");
} finally {
  globalThis.fetch = originalFetch;
  for (const key of keys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}
