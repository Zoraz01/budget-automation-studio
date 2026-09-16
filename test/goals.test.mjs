import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initGoals, goalsService, goalCents } from "../server/goals.mjs";
function fixture(t) {
  const db = new DatabaseSync(":memory:");
  initGoals(db);
  t.after(() => db.close());
  let date = new Date("2027-01-10T12:00:00Z"),
    balance = 500000,
    stale = false;
  const tx = new Map();
  const service = goalsService(db, {
    now: () => date,
    accounts: () => [
      {
        id: "checking",
        name: "Example checking",
        currency: "USD",
        balance_cents: balance,
        observed_at: stale ? "2026-01-01T00:00:00Z" : date.toISOString(),
      },
    ],
    transaction: (id) => tx.get(id),
  });
  const act = (action, body = {}) =>
    service.execute({
      action,
      ...body,
      revision: service.state().settings.revision,
      request_id: randomUUID(),
    });
  const configure = (extra = {}) =>
    act("configure", {
      source_id: "checking",
      bills: "1000",
      buffer: "500",
      monthly_limit: "1000",
      due_day: 15,
      timezone: "UTC",
      automatic: true,
      protection_confirmed: true,
      ...extra,
    });
  const create = (extra = {}) =>
    act("create", {
      name: "Example goal",
      kind: "purchase",
      target: "1000",
      monthly: "0",
      ...extra,
    }).id;
  return {
    db,
    service,
    act,
    configure,
    create,
    tx,
    setDate: (v) => {
      date = new Date(v);
    },
    setBalance: (v) => {
      balance = v;
    },
    setStale: (v) => {
      stale = v;
    },
  };
}
test("exact decimal amounts reject ambiguity and invalid precision", () => {
  assert.equal(goalCents("0.29"), 29);
  for (const v of ["1e3", "NaN", "-1", "1.001", 1, undefined])
    assert.throws(() => goalCents(v));
  assert.equal(goalCents("", { nullable: true }), null);
});
test("a wishlist does not allocate cash or invent an automatic contribution", (t) => {
  const f = fixture(t);
  const id = f.create();
  assert.equal(f.service.state().goals.find((g) => g.id === id).saved_cents, 0);
  assert.equal(f.service.state().settings.automatic, 0);
  assert.equal(f.service.state().settings.monthly_limit_cents, null);
  assert.throws(
    () => f.act("reserve", { id, amount: "1" }),
    /backing cash account/,
  );
});
test("cash reservations respect protected bills, buffer, and every other goal", (t) => {
  const f = fixture(t);
  f.configure();
  const a = f.create({ target: "4000" }),
    b = f.create();
  f.act("reserve", { id: a, amount: "3000" });
  assert.equal(f.service.capacity().available_cents, 50000);
  assert.throws(() => f.act("reserve", { id: b, amount: "501" }), /Not enough/);
  assert.equal(f.service.state().goals.find((g) => g.id === b).saved_cents, 0);
  assert.equal(f.service.capacity().source.balance_cents, 500000);
});
test("idempotent replay survives intervening revisions; changed payload conflicts", (t) => {
  const f = fixture(t);
  f.configure();
  const id = f.create();
  const payload = {
    action: "reserve",
    id,
    amount: "100",
    revision: f.service.state().settings.revision,
    request_id: randomUUID(),
  };
  f.service.execute(payload);
  f.create({ name: "Another goal" });
  f.service.execute(payload);
  assert.equal(
    f.service.state().goals.find((g) => g.id === id).saved_cents,
    10000,
  );
  assert.throws(
    () => f.service.execute({ ...payload, amount: "200" }),
    /reused/,
  );
});
test("stale revisions reject edits instead of overwriting another session", (t) => {
  const f = fixture(t);
  const revision = f.service.state().settings.revision;
  f.create();
  assert.throws(
    () =>
      f.service.execute({
        action: "create",
        name: "Second",
        kind: "purchase",
        target: "100",
        monthly: "0",
        revision,
        request_id: randomUUID(),
      }),
    /another session/,
  );
});
test("move is atomic and cannot create another claim on the same cash", (t) => {
  const f = fixture(t);
  f.configure();
  const a = f.create(),
    b = f.create({ target: "100" });
  f.act("reserve", { id: a, amount: "200" });
  assert.throws(
    () => f.act("move", { id: a, destination_id: b, amount: "150" }),
    /destination target/,
  );
  assert.equal(
    f.service.state().goals.find((g) => g.id === a).saved_cents,
    20000,
  );
  f.act("move", { id: a, destination_id: b, amount: "100" });
  assert.equal(f.service.capacity().reserved_cents, 20000);
  assert.equal(
    f.service.state().goals.find((g) => g.id === b).saved_cents,
    10000,
  );
});
test("monthly plan rejects duplicates, overcommitment, and negative contributions", (t) => {
  const f = fixture(t);
  f.configure({ monthly_limit: "100" });
  const a = f.create({ monthly: "100" });
  assert.throws(() => f.create({ monthly: "1" }), /exceed/);
  assert.throws(
    () =>
      f.act("plan", {
        monthly_limit: "100",
        contributions: [
          { id: a, amount: "50" },
          { id: a, amount: "50" },
        ],
      }),
    /duplicate/,
  );
  assert.throws(() =>
    f.act("plan", {
      monthly_limit: "100",
      contributions: [{ id: a, amount: "-1" }],
    }),
  );
  assert.equal(f.service.state().monthly_total_cents, 10000);
});
test("automatic allocation runs once, advances due date, and caps at target", (t) => {
  const f = fixture(t);
  f.configure();
  const id = f.create({ target: "125", monthly: "100" });
  f.setDate("2027-01-15T12:00:00Z");
  assert.equal(f.service.runDue().allocated, 1);
  assert.equal(f.service.runDue().allocated, 0);
  f.setDate("2027-02-15T12:00:00Z");
  f.configure();
  assert.equal(f.service.runDue().allocated, 1);
  const g = f.service.state().goals.find((g) => g.id === id);
  assert.equal(g.saved_cents, 12500);
  assert.equal(g.monthly_cents, 0);
  assert.equal(g.next_due, null);
});
test("shortfalls wait without partial allocation then recover exactly once", (t) => {
  const f = fixture(t);
  f.configure();
  const id = f.create({ monthly: "100" });
  f.setDate("2027-01-15T12:00:00Z");
  f.setBalance(155000);
  assert.equal(f.service.runDue().allocated, 0);
  assert.equal(f.service.state().waiting.length, 1);
  const revision = f.service.state().settings.revision;
  f.service.runDue();
  assert.equal(f.service.state().settings.revision, revision);
  f.setBalance(200000);
  f.service.runDue();
  assert.equal(
    f.service.state().goals.find((g) => g.id === id).saved_cents,
    10000,
  );
  assert.equal(f.service.state().waiting.length, 0);
});
test("priority 1 gets funded before default unranked goals", (t) => {
  const f = fixture(t);
  f.configure();
  const last = f.create({ monthly: "100", priority: 0 }),
    first = f.create({ monthly: "100", priority: 1 });
  f.setBalance(160000);
  f.setDate("2027-01-15T12:00:00Z");
  f.service.runDue();
  assert.equal(
    f.service.state().goals.find((g) => g.id === first).saved_cents,
    10000,
  );
  assert.equal(
    f.service.state().goals.find((g) => g.id === last).saved_cents,
    0,
  );
});
test("stale or missing balance and expired protection fail closed", (t) => {
  const f = fixture(t);
  f.configure();
  const id = f.create({ monthly: "100" });
  f.setStale(true);
  assert.throws(() => f.act("reserve", { id, amount: "1" }), /stale/);
  f.setDate("2027-01-15T12:00:00Z");
  assert.equal(f.service.runDue().allocated, 0);
  f.setStale(false);
  f.setBalance(null);
  assert.equal(f.service.capacity().available_cents, null);
  f.setBalance(500000);
  f.setDate("2027-03-01T12:00:00Z");
  assert.throws(() => f.act("reserve", { id, amount: "1" }), /Review bills/);
});
test("offline months are not accumulated on restart", (t) => {
  const f = fixture(t);
  f.configure();
  const id = f.create({ monthly: "100" });
  f.setDate("2027-04-20T12:00:00Z");
  f.configure();
  f.service.runDue();
  assert.equal(
    f.service.state().goals.find((g) => g.id === id).saved_cents,
    10000,
  );
});
test("monthly allocation cap cannot be bypassed by replacing funded goals", (t) => {
  const f = fixture(t);
  f.configure({ monthly_limit: "100" });
  const a = f.create({ target: "100", monthly: "100" });
  f.setDate("2027-01-15T12:00:00Z");
  f.service.runDue();
  assert.equal(
    f.service.state().goals.find((g) => g.id === a).monthly_cents,
    0,
  );
  const b = f.create({ monthly: "100" });
  f.db.prepare("UPDATE goals SET next_due='2027-01-15' WHERE id=?").run(b);
  f.service.runDue();
  assert.equal(f.service.state().goals.find((g) => g.id === b).saved_cents, 0);
  assert.match(f.service.state().waiting[0].reason, /limit/);
});
test("cash reservations remain distinct from card payment holds", (t) => {
  const f = fixture(t);
  f.configure();
  const id = f.create();
  f.act("reserve", { id, amount: "500" });
  const available = f.service.capacity().available_cents;
  const p = f.act("purchase", {
    id,
    amount: "400",
    method: "card",
    confirmed: true,
  }).id;
  assert.equal(
    f.service.state().goals.find((g) => g.id === id).status,
    "completed",
  );
  assert.equal(f.service.capacity().payment_holds_cents, 40000);
  assert.equal(f.service.capacity().available_cents, available + 10000);
  assert.throws(() => f.act("settle", { purchase_id: p }), /Confirm/);
  f.setBalance(460000);
  f.act("settle", { purchase_id: p, confirmed: true });
  assert.equal(f.service.capacity().payment_holds_cents, 0);
  assert.equal(f.service.capacity().available_cents, available + 10000);
});
test("long-term funds allow partial purchases without stopping the fund", (t) => {
  const f = fixture(t);
  f.configure();
  const id = f.create({ kind: "longterm", target: "", monthly: "100" });
  f.act("reserve", { id, amount: "700" });
  f.act("purchase", { id, amount: "200", method: "cash", confirmed: true });
  const g = f.service.state().goals.find((g) => g.id === id);
  assert.equal(g.status, "active");
  assert.equal(g.saved_cents, 50000);
  assert.equal(g.monthly_cents, 10000);
  assert.equal(f.service.capacity().payment_holds_cents, 20000);
});
test("purchase links require amount, status, currency, and uniqueness; changes stay visible", (t) => {
  const f = fixture(t);
  f.configure();
  const id = f.create({ kind: "longterm" });
  f.act("reserve", { id, amount: "400" });
  f.tx.set("receipt", {
    id: "receipt",
    amount_cents: 20000,
    currency: "USD",
    pending: false,
    removed: false,
    transfer: false,
    method: "card",
    date: "2027-01-10",
    description: "Example shop",
  });
  assert.throws(
    () =>
      f.act("purchase", {
        id,
        amount: "100",
        method: "card",
        transaction_id: "receipt",
        confirmed: true,
      }),
    /same amount/,
  );
  f.act("purchase", {
    id,
    amount: "200",
    method: "card",
    transaction_id: "receipt",
    confirmed: true,
  });
  assert.throws(
    () =>
      f.act("purchase", {
        id,
        amount: "200",
        method: "card",
        transaction_id: "receipt",
        confirmed: true,
      }),
    /already linked/,
  );
  assert.equal(
    f.service.state().goals.find((g) => g.id === id).saved_cents,
    20000,
  );
  f.tx.get("receipt").removed = true;
  assert.match(f.service.state().purchases[0].attention, /changed/);
  f.tx.get("receipt").removed = false;
  f.tx.get("receipt").transfer = true;
  assert.match(f.service.state().purchases[0].attention, /changed/);
  f.tx.get("receipt").transfer = false;
  f.tx.get("receipt").eligible = false;
  assert.match(f.service.state().purchases[0].attention, /changed/);
  assert.throws(
    () =>
      f.act("purchase", {
        id,
        amount: "200",
        method: "card",
        transaction_id: "receipt",
        confirmed: true,
      }),
    /posted purchase/,
  );
  f.tx.get("receipt").eligible = true;
  f.tx.get("receipt").method = "cash";
  assert.match(f.service.state().purchases[0].attention, /changed/);
  assert.equal(f.service.capacity().payment_holds_cents, 20000);
});
test("waiting notices stop when a contribution is paused or rescheduled", (t) => {
  const f = fixture(t);
  f.configure();
  const id = f.create({ monthly: "100" });
  f.setDate("2027-01-15T12:00:00Z");
  f.setStale(true);
  f.service.runDue();
  assert.equal(f.service.state().waiting.length, 1);
  f.configure({ automatic: false });
  assert.equal(f.service.state().waiting.length, 0);
  f.configure({ automatic: true });
  assert.equal(f.service.state().waiting.length, 0);
  f.db.prepare("UPDATE goals SET next_due='2027-01-15' WHERE id=?").run(id);
  assert.equal(f.service.state().waiting.length, 1);
  f.act("plan", {
    monthly_limit: "1000",
    contributions: [{ id, amount: "0" }],
  });
  assert.equal(f.service.state().waiting.length, 0);
});
test("archiving requires confirmation and releases only unspent reservations", (t) => {
  const f = fixture(t);
  f.configure();
  const id = f.create({ kind: "longterm", monthly: "100" });
  f.act("reserve", { id, amount: "300" });
  f.act("purchase", { id, amount: "100", method: "cash", confirmed: true });
  assert.throws(() => f.act("archive", { id }), /Confirm/);
  f.act("archive", { id, confirmed: true });
  assert.equal(f.service.capacity().reserved_cents, 0);
  assert.equal(f.service.capacity().payment_holds_cents, 10000);
  assert.equal(f.service.state().monthly_total_cents, 0);
  f.act("restore", { id });
  assert.equal(
    f.service.state().goals.find((g) => g.id === id).monthly_cents,
    0,
  );
});
test("backing account cannot be changed while reservations or holds exist", (t) => {
  const f = fixture(t);
  f.configure();
  const id = f.create();
  f.act("reserve", { id, amount: "100" });
  f.act("cash", { name: "Example savings", balance: "1000", confirmed: true });
  assert.throws(() => f.configure({ source_id: "manual" }), /before changing/);
});
test("new schedules use local calendar and never allocate before the configured day", (t) => {
  const f = fixture(t);
  f.configure({ timezone: "America/New_York", due_day: 15 });
  const id = f.create({ monthly: "100" });
  f.setDate("2027-01-15T02:00:00Z");
  assert.equal(f.service.runDue().allocated, 0);
  f.setDate("2027-01-15T05:00:00Z");
  assert.equal(f.service.runDue().allocated, 1);
  assert.equal(
    f.service.state().goals.find((g) => g.id === id).saved_cents,
    10000,
  );
});
test("schema initialization is repeatable and stored goals survive reopening", () => {
  const dir = mkdtempSync(join(tmpdir(), "goals-test-"));
  try {
    let db = new DatabaseSync(join(dir, "fixture.db"));
    initGoals(db);
    const s = goalsService(db);
    s.execute({
      action: "create",
      name: "Persistent goal",
      kind: "longterm",
      target: "",
      monthly: "0",
      revision: 0,
      request_id: randomUUID(),
    });
    db.close();
    db = new DatabaseSync(join(dir, "fixture.db"));
    initGoals(db);
    assert.equal(goalsService(db).state().goals[0].name, "Persistent goal");
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("manual overdrafts remain negative and cannot fund a goal", (t) => {
  const f = fixture(t);
  f.act("cash", { name: "Example cash", balance: "-25.10", confirmed: true });
  f.configure({ source_id: "manual", bills: "0", buffer: "0" });
  assert.equal(f.service.capacity().source.balance_cents, -2510);
  assert.equal(f.service.capacity().available_cents, 0);
  assert.equal(f.service.capacity().shortfall_cents, 2510);
});
