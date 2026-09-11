import test from "node:test";
import assert from "node:assert/strict";
import { cents, date, month, summarize } from "../server/domain.mjs";
import { configuration } from "../server/config.mjs";
import { seal, unseal } from "../server/vault.mjs";
import { openStore } from "../server/store.mjs";
import { assistantContext, answer } from "../server/providers/ai.mjs";
const key = "a".repeat(64);
const categories = [
  { id: "expense", kind: "expense", name: "Food" },
  { id: "income", kind: "income" },
  { id: "transfer", kind: "transfer" },
];
const tx = (amount, category, extra = {}) => ({
  date: "2026-05-03",
  amount_cents: amount,
  category_id: category,
  reviewed: 1,
  ...extra,
});
test("decimal money uses exact cents, including negative refunds", () => {
  assert.equal(cents("0.29"), 29);
  assert.equal(cents("-1.05"), -105);
  assert.equal(cents("100"), 10000);
  assert.throws(() => cents("1.001"));
  assert.throws(() => cents("NaN"));
  assert.throws(() => cents("1e3"));
});
test("calendar validation rejects normalized invalid days and invalid months", () => {
  assert.equal(date("2024-02-29"), "2024-02-29");
  assert.throws(() => date("2026-02-29"));
  assert.throws(() => date("2026-04-31"));
  assert.throws(() => month("2026-13"));
});
test("summary excludes transfers, pending, removed and other months; refunds reduce spending", () => {
  const result = summarize(
    [
      tx(-200000, "income"),
      tx(50000, "expense"),
      tx(-10000, "expense"),
      tx(90000, "transfer"),
      tx(10000, "expense", { pending: 1 }),
      tx(10000, "expense", { removed: 1 }),
      tx(10000, "expense", { date: "2026-06-01" }),
      tx(100, "expense", { reviewed: 0 }),
    ],
    categories,
    [{ month: "2026-05", category_id: "expense", limit_cents: 60000 }],
    "2026-05",
  );
  assert.equal(result.income_cents, 200000);
  assert.equal(result.spent_cents, 40100);
  assert.equal(result.net_cents, 159900);
  assert.equal(result.categories[0].remaining_cents, 19900);
  assert.equal(result.pending_count, 1);
  assert.equal(result.unreviewed_count, 1);
});
test("negative income reversals and expense refunds maintain their category semantics", () => {
  const r = summarize(
    [tx(500, "income"), tx(-100, "expense")],
    categories,
    [],
    "2026-05",
  );
  assert.equal(r.income_cents, -500);
  assert.equal(r.spent_cents, -100);
  assert.equal(r.net_cents, -400);
});
test("vault authenticates ciphertext and binds it to a connection ID", () => {
  const encrypted = seal({ access_token: "synthetic-fixture" }, key, "one");
  assert.deepEqual(unseal(encrypted, key, "one"), {
    access_token: "synthetic-fixture",
  });
  assert.ok(!encrypted.includes("synthetic-fixture"));
  assert.throws(() => unseal(encrypted, key, "two"));
  assert.throws(() => unseal(encrypted, "b".repeat(64), "one"));
  const chunks = encrypted.split(".");
  chunks[2] = Buffer.from("tampered").toString("base64");
  assert.throws(() => unseal(chunks.join("."), key, "one"));
});
test("personal mode refuses absent secrets and unapproved production Plaid", () => {
  assert.throws(() => configuration({ APP_MODE: "personal" }));
  assert.throws(() =>
    configuration({
      APP_MODE: "personal",
      APP_PASSWORD: "p".repeat(24),
      VAULT_KEY: key,
      PLAID_ENV: "production",
    }),
  );
  assert.equal(
    configuration({
      APP_MODE: "personal",
      APP_PASSWORD: "p".repeat(24),
      VAULT_KEY: key,
    }).plaid,
    false,
  );
});
test("demo disables all providers even if credentials are present in the environment", () => {
  const c = configuration({
    APP_MODE: "demo",
    PLAID_CLIENT_ID: "fixture",
    PLAID_SECRET: "fixture",
    SNAPTRADE_CLIENT_ID: "fixture",
    SNAPTRADE_CONSUMER_KEY: "fixture",
    AI_PROVIDER: "ollama",
    OLLAMA_MODEL: "fixture",
  });
  assert.equal(c.plaid, false);
  assert.equal(c.snaptrade, false);
  assert.equal(c.ai, false);
});
test("unsupported currency and invalid ports fail closed", () => {
  assert.throws(() => configuration({ BUDGET_CURRENCY: "JPY" }));
  assert.throws(() => configuration({ PORT: "0" }));
  assert.throws(() => configuration({ PORT: "4310.1" }));
});
test("SQLite rolls back a partially applied batch", () => {
  const s = openStore(":memory:", key, "USD");
  try {
    assert.throws(() =>
      s.atomic(() => {
        s.budget("2026-05", "food", 10000);
        throw new Error("fixture");
      }),
    );
    assert.equal(s.db.prepare("SELECT count(*) AS n FROM budgets").get().n, 0);
  } finally {
    s.close();
  }
});
test("demo seed is idempotent and contains no live connections", () => {
  const s = openStore(":memory:", key, "USD");
  try {
    s.seed("2026-05");
    s.seed("2026-05");
    assert.equal(
      s.db.prepare("SELECT count(*) AS n FROM transactions").get().n,
      11,
    );
    assert.equal(
      s.db.prepare("SELECT count(*) AS n FROM connections").get().n,
      0,
    );
  } finally {
    s.close();
  }
});
test("AI context contains only approved aggregates", () => {
  const summary = summarize([tx(100, "expense")], categories, [], "2026-05");
  const c = assistantContext(
    {
      ...summary,
      secret: "should-not-appear",
      transactions: [{ description: "private merchant" }],
    },
    "USD",
  );
  assert.ok(!JSON.stringify(c).includes("should-not-appear"));
  assert.ok(!JSON.stringify(c).includes("private merchant"));
  assert.equal(c.spent_cents, 100);
});
test("disabled AI answers without a network request", async () => {
  const summary = summarize([tx(100, "expense")], categories, [], "2026-05");
  const result = await answer(
    "Cash flow",
    summary,
    { ai: false, currency: "USD" },
    () => {
      throw new Error("Network forbidden");
    },
  );
  assert.equal(result.mode, "summary");
  assert.match(result.answer, /1.00/);
});
test("local AI rejects cloud model names", async () => {
  await assert.rejects(
    answer(
      "Question",
      summarize([], categories, [], "2026-05"),
      { ai: true, currency: "USD", env: { OLLAMA_MODEL: "fixture-cloud" } },
      () => {
        throw new Error("Network forbidden");
      },
    ),
    /locally downloaded/,
  );
});
