import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { build } from "esbuild";

const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");

let session = { user: { name: "Test Manager", role: "MANAGER", isSuperadmin: false } };
let writes = 0;
let rebalanceCalls = [];
const notes = [];
let noteSequence = 0;

const member = (id, name, role = "DEVELOPER") => ({ id, name, role, isActive: true });
const members = [
  member("m1", "Alpha Dev"),
  member("m2", "Beta Dev"),
  member("manager", "Test Manager", "MANAGER"),
];

function match(value, where = {}) {
  return Object.entries(where).every(([key, condition]) => {
    const field = value[key];
    if (condition && typeof condition === "object" && !(condition instanceof Date)) {
      if ("in" in condition) return condition.in.includes(field);
    }
    return field === condition;
  });
}

const prisma = {
  teamMember: {
    findFirst: async ({ where }) => members.find((entry) => match(entry, where)) || null,
  },
  oneOnOneNote: {
    findMany: async ({ where }) =>
      notes
        .filter((note) => match(note, where))
        .sort((a, b) => b.date - a.date || b.createdAt - a.createdAt),
    create: async ({ data }) => {
      writes++;
      const now = new Date();
      const note = {
        id: `note-${++noteSequence}`,
        memberId: data.memberId,
        authorId: data.authorId,
        authorName: data.authorName,
        date: data.date,
        focusArea: data.focusArea,
        actionItems: data.actionItems,
        sentiment: data.sentiment,
        createdAt: now,
        updatedAt: now,
      };
      notes.push(note);
      return note;
    },
    findFirst: async ({ where }) => notes.find((note) => match(note, where)) || null,
    update: async ({ where, data }) => {
      writes++;
      const index = notes.findIndex((note) => note.id === where.id);
      notes[index] = { ...notes[index], ...data, updatedAt: new Date() };
      return notes[index];
    },
    delete: async ({ where }) => {
      writes++;
      const index = notes.findIndex((note) => note.id === where.id);
      return notes.splice(index, 1)[0];
    },
  },
};

globalThis.__prototypeMergeSmoke = {
  auth: async () => session,
  prisma,
  rebalance: async (input) => {
    rebalanceCalls.push(input);
    return {
      movedIssueIds: [...input.issueIds],
      fromMember: { id: input.fromMemberId, name: "Alpha Dev" },
      toMember: { id: input.toMemberId, name: "Beta Dev" },
    };
  },
};

const result = await build({
  stdin: {
    contents: `
      export { GET as notesGet, POST as notesPost, PATCH as notesPatch, DELETE as notesDelete } from './src/app/api/members/[id]/notes/route';
      export { POST as rebalancePost } from './src/app/api/issues/rebalance/route';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  packages: "external",
  plugins: [
    {
      name: "prototype-merge-fixtures",
      setup(builder) {
        builder.onResolve({ filter: /^@\/lib\/(auth|prisma|rebalance)$/ }, ({ path }) => ({
          path,
          namespace: "fixture",
        }));
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
          contents: {
            "@/lib/auth": "export const auth = globalThis.__prototypeMergeSmoke.auth;",
            "@/lib/prisma": "export const prisma = globalThis.__prototypeMergeSmoke.prisma;",
            "@/lib/rebalance":
              "export const executeRebalance = (input) => globalThis.__prototypeMergeSmoke.rebalance(input);",
          }[path],
          loader: "js",
        }));
      },
    },
  ],
});
const module = { exports: {} };
new Function("require", "module", "exports", result.outputFiles[0].text)(require, module, module.exports);
const { notesGet, notesPost, notesPatch, notesDelete, rebalancePost } = module.exports;

async function call(handler, { method = "GET", memberId = "m1", query = "", body, raw } = {}) {
  const request = new NextRequest(`http://localhost/api/members/${memberId}/notes?${query}`, {
    method,
    ...(method === "GET"
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: raw ?? JSON.stringify(body),
        }),
  });
  const response = await handler(request, { params: Promise.resolve({ id: memberId }) });
  const contentType = response.headers.get("content-type") || "";
  return {
    status: response.status,
    body: contentType.includes("application/json")
      ? await response.json()
      : await response.text(),
  };
}

const validNote = {
  date: "2026-11-04",
  focusArea: "  Kapasitas sprint dan delegasi  ",
  actionItems: "  Serahkan review PR ke Beta Dev  ",
  sentiment: "POSITIVE",
};
const asDeveloper = (id) => ({ user: { id, name: "Developer", role: "DEVELOPER", isSuperadmin: false } });

session = null;
assert.equal((await call(notesGet, { query: "" })).status, 401);
assert.equal((await call(notesPost, { method: "POST", body: validNote })).status, 401);

session = { user: { name: "Test Manager", role: "MANAGER", isSuperadmin: false } };
assert.equal((await call(notesGet)).status, 200);
assert.deepEqual((await call(notesGet)).body, []);

for (const [label, body] of [
  ["missing date", { ...validNote, date: undefined }],
  ["impossible date", { ...validNote, date: "2026-02-30" }],
  ["long focus", { ...validNote, focusArea: "x".repeat(501) }],
  ["long action", { ...validNote, actionItems: "x".repeat(2001) }],
  ["lowercase sentiment", { ...validNote, sentiment: "positive" }],
  ["unknown field", { ...validNote, memberId: "m2" }],
]) {
  const before = writes;
  const response = await call(notesPost, { method: "POST", body });
  assert.equal(response.status, 400, label);
  assert.equal(writes, before, `${label} must not write`);
}

const created = await call(notesPost, { method: "POST", body: validNote });
assert.equal(created.status, 201);
assert.equal(created.body.focusArea, "Kapasitas sprint dan delegasi");
assert.equal(created.body.actionItems, "Serahkan review PR ke Beta Dev");
assert.equal(created.body.sentiment, "POSITIVE");
assert.equal(created.body.date, "2026-11-04");
assert.equal(created.body.authorName, "Test Manager");
const noteId = created.body.id;

assert.equal(
  (await call(notesGet, { memberId: "m2" })).body.length,
  0,
  "Notes are scoped to the requested member",
);

const patched = await call(notesPatch, {
  method: "PATCH",
  body: { id: noteId, ...validNote, focusArea: "Fokus baru", sentiment: "NEEDS_SUPPORT" },
});
assert.equal(patched.status, 200, "PATCH accepts the note id alongside its fields");
assert.equal(patched.body.focusArea, "Fokus baru");
assert.equal(patched.body.sentiment, "NEEDS_SUPPORT");
assert.equal((await call(notesPatch, { method: "PATCH", body: validNote })).status, 400);
assert.equal(
  (await call(notesPatch, {
    method: "PATCH",
    memberId: "m2",
    body: { id: noteId, ...validNote },
  })).status,
  404,
  "Cannot patch another member's note",
);

session = asDeveloper("m2");
assert.equal((await call(notesGet, { memberId: "m1" })).status, 403);
assert.equal(
  (await call(notesPost, { method: "POST", body: validNote })).status,
  403,
  "Developer cannot write another member's notes before validation",
);
assert.equal((await call(notesGet, { memberId: "m2" })).status, 200);
const ownNote = await call(notesPost, { method: "POST", memberId: "m2", body: validNote });
assert.equal(ownNote.status, 201);
assert.equal(ownNote.body.memberId, "m2");

session = { user: { name: "Test Manager", role: "MANAGER", isSuperadmin: false } };
assert.equal((await call(notesDelete, { method: "DELETE", query: "noteId=" })).status, 400);
assert.equal(
  (await call(notesDelete, { method: "DELETE", memberId: "m2", query: `noteId=${noteId}` })).status,
  404,
);
assert.equal((await call(notesDelete, { method: "DELETE", query: `noteId=${noteId}` })).status, 204);
assert.equal((await call(notesDelete, { method: "DELETE", query: `noteId=${noteId}` })).status, 404);

const rebalance = (body) =>
  call(rebalancePost, { method: "POST", memberId: "m1", body });
session = null;
assert.equal((await rebalance({})).status, 401);
session = asDeveloper("m2");
assert.equal((await rebalance({})).status, 403);
session = { user: { name: "Test Manager", role: "MANAGER", isSuperadmin: false } };

const validRebalance = { fromMemberId: "m1", toMemberId: "m2", issueIds: ["i1", "i2"] };
for (const [label, body] of [
  ["same member", { ...validRebalance, toMemberId: "m1" }],
  ["empty issues", { ...validRebalance, issueIds: [] }],
  ["too many issues", { ...validRebalance, issueIds: Array.from({ length: 51 }, (_, i) => `i${i}`) }],
  ["duplicate issues", { ...validRebalance, issueIds: ["i1", "i1"] }],
  ["invalid id", { ...validRebalance, issueIds: ["../etc/passwd"] }],
  ["unknown field", { ...validRebalance, note: "hi" }],
]) {
  const before = rebalanceCalls.length;
  assert.equal((await rebalance(body)).status, 400, label);
  assert.equal(rebalanceCalls.length, before, `${label} must not execute`);
}

const moved = await rebalance(validRebalance);
assert.equal(moved.status, 200);
assert.equal(moved.body.internalOnly, true);
assert.deepEqual(moved.body.movedIssueIds, ["i1", "i2"]);
assert.equal(rebalanceCalls.length, 1);
assert.deepEqual(rebalanceCalls[0], {
  fromMemberId: "m1",
  toMemberId: "m2",
  issueIds: ["i1", "i2"],
  actorId: null,
  actorName: "Test Manager",
});

console.log(
  "Prototype merge checks passed: note permissions/validation/PATCH id, member scoping, delete guards, rebalance 401/403/400 and internal-only execution.",
);
