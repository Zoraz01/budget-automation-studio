import { DatabaseSync as Database } from "node:sqlite";
import { historyStore, historyWorker } from "../server/chat-history.mjs";

import { randomUUID, randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
function fixture(t, file = false) {
  const dir = mkdtempSync(join(tmpdir(), "chat-test-")),
    path = file ? join(dir, "history.sqlite") : ":memory:";
  const key = randomBytes(32).toString("hex");
  const db = new Database(path);
  db.exec("PRAGMA foreign_keys=ON");
  const store = historyStore(db, key);
  t.after(() => {
    try {
      db.close();
    } catch {}
    rmSync(dir, { recursive: true, force: true });
  });
  return { db, store, key, path };
}
const request = (revision = 0, question = "How much is my demo budget?") => ({
  requestId: randomUUID(),
  question,
  revision,
  context: { month: "2026-09" },
});
const settle = () => new Promise((resolve) => setImmediate(resolve));
test("encrypted history survives reopen with title, evidence and original timestamps", (t) => {
  const { db, store, key, path } = fixture(t, true),
    c = store.create("owner");
  const accepted = store.accept("owner", c.id, request());
  store.finish("owner", c.id, accepted.turn.id, {
    answer: "Invented answer 42",
    sql: ["SELECT 42"],
  });
  const original = store.read("owner", c.id);
  db.close();
  assert.equal(
    readFileSync(path).includes(Buffer.from("Invented answer")),
    false,
  );
  const reopened = new Database(path);
  const second = historyStore(reopened, key);
  assert.deepEqual(second.read("owner", c.id), original);
  assert.throws(() =>
    historyStore(reopened, randomBytes(32).toString("hex")).list("owner"),
  );
  reopened.close();
});
test("other owners cannot list, read, edit, delete, send or obtain context", (t) => {
  const { store } = fixture(t),
    c = store.create("alice");
  assert.equal(store.list("bob").threads.length, 0);
  for (const fn of [
    () => store.read("bob", c.id),
    () => store.update("bob", c.id, { revision: 0, title: "wrong" }),
    () => store.remove("bob", c.id),
    () => store.accept("bob", c.id, request()),
    () => store.context("bob", c.id),
    () => store.create("bob", c.id),
  ])
    assert.throws(fn, (e) => e.status === 404);
});
test("send is durable and idempotent; conflicting ids and stale revisions cannot reorder turns", async (t) => {
  const { store } = fixture(t);
  let calls = 0,
    release;
  const deferred = new Promise((r) => {
    release = r;
  });
  const worker = historyWorker(store, async () => {
    calls++;
    await deferred;
    return { answer: "Example response" };
  });
  const c = store.create("owner"),
    body = request();
  const first = await worker.send("owner", c.id, body);
  const duplicate = await worker.send("owner", c.id, body);
  assert.equal(first.id, duplicate.id);
  assert.equal(calls, 1);
  await assert.rejects(
    worker.send("owner", c.id, { ...body, question: "different" }),
    (e) => e.status === 409,
  );
  await assert.rejects(
    worker.send("owner", c.id, request(1)),
    (e) => e.status === 429,
  );
  release();
  await settle();
  assert.equal(store.read("owner", c.id).turns[0].state, "completed");
  const done = await worker.send("owner", c.id, body);
  assert.equal(done.state, "completed");
  assert.equal(calls, 1);
  assert.throws(
    () => store.accept("owner", c.id, request(0)),
    (e) => e.status === 409,
  );
});
test("restart marks unknown work interrupted without any automatic provider replay", async (t) => {
  const { store } = fixture(t),
    c = store.create("owner"),
    body = request();
  store.accept("owner", c.id, body);
  store.recover();
  let calls = 0;
  const worker = historyWorker(
    store,
    async () => {
      calls++;
      return { answer: "no" };
    },
    () => false,
  );
  assert.equal((await worker.send("owner", c.id, body)).state, "interrupted");
  assert.equal(calls, 0);
  assert.equal(store.read("owner", c.id).turns[0].question, body.question);
});
test("deletion during generation cannot recreate or return deleted content", async (t) => {
  const { store } = fixture(t);
  let release;
  const worker = historyWorker(
    store,
    () =>
      new Promise((r) => {
        release = r;
      }),
  );
  const c = store.create("owner"),
    body = request();
  await worker.send("owner", c.id, body);
  store.remove("owner", c.id);
  release({ answer: "must not return" });
  await settle();
  assert.throws(
    () => store.read("owner", c.id),
    (e) => e.status === 404,
  );
  await assert.rejects(
    worker.send("owner", c.id, body),
    (e) => e.status === 404,
  );
});
test("rename, pin, archive and bounded pagination preserve all saved messages", (t) => {
  const { store } = fixture(t),
    c = store.create("owner");
  for (let i = 0; i < 34; i++) {
    const r = store.accept("owner", c.id, request(i * 2, `Question ${i}`));
    store.finish("owner", c.id, r.turn.id, { answer: `Answer ${i}` });
  }
  let d = store.read("owner", c.id);
  assert.equal(d.turns.length, 30);
  assert.equal(store.read("owner", c.id, d.before).turns.length, 4);
  assert.equal(store.context("owner", c.id).length, 20);
  const edited = store.update("owner", c.id, {
    revision: d.thread.revision,
    title: "Renamed",
    pinned: true,
    archived: true,
  });
  assert.equal(store.list("owner").threads.length, 0);
  assert.equal(
    store.list("owner", { archived: true }).threads[0].title,
    "Renamed",
  );
  assert.throws(
    () => store.accept("owner", c.id, request(edited.revision)),
    (e) => e.status === 409,
  );
  store.update("owner", c.id, { revision: edited.revision, archived: false });
  for (let i = 0; i < 31; i++) store.create("owner");
  assert.equal(store.list("owner").threads.length, 30);
  assert.equal(store.list("owner", { offset: 30 }).threads.length, 2);
});
test("provider failure preserves the question and never stores provider error text", async (t) => {
  const { store, db } = fixture(t),
    c = store.create("owner");
  const worker = historyWorker(store, async () => {
    throw new Error("sensitive provider response");
  });
  await worker.send("owner", c.id, request());
  await settle();
  assert.equal(store.read("owner", c.id).turns[0].state, "failed");
  assert.equal(db.prepare("SELECT reply FROM chat_turns").get().reply, null);
});
