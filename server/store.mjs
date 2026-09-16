import { initGoals } from "./goals.mjs";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { seal, unseal } from "./vault.mjs";
import { summarize, InputError } from "./domain.mjs";
export function openStore(path, key, currency) {
  if (path !== ":memory:")
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  if (path !== ":memory:") chmodSync(path, 0o600);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, kind TEXT NOT NULL CHECK(kind IN ('expense','income','transfer')));
    CREATE TABLE IF NOT EXISTS budgets (month TEXT NOT NULL, category_id TEXT NOT NULL REFERENCES categories(id), limit_cents INTEGER NOT NULL CHECK(limit_cents>=0), PRIMARY KEY(month,category_id));
    CREATE TABLE IF NOT EXISTS connections (id TEXT PRIMARY KEY, provider TEXT NOT NULL, secret TEXT NOT NULL, cursor TEXT, synced_at TEXT, status TEXT NOT NULL DEFAULT 'never');
    CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, source TEXT NOT NULL, connection_id TEXT REFERENCES connections(id), date TEXT NOT NULL, description TEXT NOT NULL, amount_cents INTEGER NOT NULL, currency TEXT NOT NULL, category_id TEXT NOT NULL REFERENCES categories(id), pending INTEGER NOT NULL DEFAULT 0, removed INTEGER NOT NULL DEFAULT 0, reviewed INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS transaction_dates ON transactions(date);
    CREATE TABLE IF NOT EXISTS investments (id TEXT PRIMARY KEY, name TEXT NOT NULL, value_cents INTEGER, currency TEXT, status TEXT NOT NULL, synced_at TEXT NOT NULL);`);
  initGoals(db);
  const schema = db
    .prepare("SELECT value FROM meta WHERE key='schema_version'")
    .get();
  if (schema && schema.value !== "1") {
    db.close();
    throw new Error("Unsupported database schema version");
  }
  db.prepare("INSERT OR IGNORE INTO meta VALUES (?,?)").run(
    "schema_version",
    "1",
  );
  const current = db
    .prepare("SELECT value FROM meta WHERE key=?")
    .get("currency");
  if (current && current.value !== currency) {
    db.close();
    throw new Error(
      "Currency differs from existing database. Use a separate instance for another currency.",
    );
  }
  db.prepare("INSERT OR IGNORE INTO meta VALUES (?,?)").run(
    "currency",
    currency,
  );
  for (const [id, name, kind] of [
    ["uncategorized", "Uncategorized", "expense"],
    ["housing", "Housing", "expense"],
    ["food", "Groceries", "expense"],
    ["dining", "Dining out", "expense"],
    ["transport", "Transport", "expense"],
    ["lifestyle", "Lifestyle", "expense"],
    ["income", "Income", "income"],
    ["transfer", "Transfers", "transfer"],
  ])
    db.prepare("INSERT OR IGNORE INTO categories VALUES (?,?,?)").run(
      id,
      name,
      kind,
    );
  function atomic(fn) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const r = fn();
      db.exec("COMMIT");
      return r;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  function connection(id) {
    const r = db.prepare("SELECT * FROM connections WHERE id=?").get(id);
    return r ? { ...r, credentials: unseal(r.secret, key, id) } : null;
  }
  function saveConnection(id, provider, credentials) {
    db.prepare(
      "INSERT INTO connections (id,provider,secret) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET secret=excluded.secret",
    ).run(id, provider, seal(credentials, key, id));
  }
  function summary(m) {
    return summarize(
      db.prepare("SELECT * FROM transactions").all(),
      db.prepare("SELECT * FROM categories").all(),
      db.prepare("SELECT * FROM budgets WHERE month=?").all(m),
      m,
    );
  }
  function upsertPlaid(t, connectionId) {
    db.prepare(
      `INSERT INTO transactions (id,source,connection_id,date,description,amount_cents,currency,category_id,pending,reviewed) VALUES (?,'plaid',?,?,?,?,?,?,?,0)
      ON CONFLICT(id) DO UPDATE SET date=excluded.date,description=excluded.description,amount_cents=excluded.amount_cents,currency=excluded.currency,pending=excluded.pending,removed=0,reviewed=CASE WHEN transactions.amount_cents!=excluded.amount_cents OR transactions.date!=excluded.date OR transactions.description!=excluded.description THEN 0 ELSE transactions.reviewed END`,
    ).run(
      t.id,
      connectionId,
      t.date,
      t.description,
      t.amount_cents,
      t.currency,
      t.category_id,
      Number(t.pending),
    );
  }
  function budget(m, id, limit) {
    if (
      !db
        .prepare("SELECT id FROM categories WHERE id=? AND kind='expense'")
        .get(id)
    )
      throw new InputError("Choose an expense category");
    db.prepare(
      "INSERT INTO budgets VALUES (?,?,?) ON CONFLICT(month,category_id) DO UPDATE SET limit_cents=excluded.limit_cents",
    ).run(m, id, limit);
  }
  function seed(m) {
    if (db.prepare("SELECT value FROM meta WHERE key='seeded'").get()) return;
    atomic(() => {
      for (const [id, limit] of [
        ["housing", 160000],
        ["food", 45000],
        ["dining", 20000],
        ["transport", 15000],
        ["lifestyle", 25000],
      ])
        budget(m, id, limit);
      for (const [day, description, amount, category, pending] of [
        ["01", "Example payroll", -480000, "income", 0],
        ["02", "Apartment rent", 145000, "housing", 0],
        ["03", "Weekly grocery shop", 12640, "food", 0],
        ["04", "Neighborhood café", 1875, "dining", 0],
        ["05", "Transit pass", 6500, "transport", 0],
        ["06", "Bookshop", 3490, "lifestyle", 0],
        ["07", "Weekend groceries", 9820, "food", 0],
        ["08", "Dinner with friends", 6420, "dining", 0],
        ["09", "Savings transfer", 50000, "transfer", 0],
        ["10", "Clothing return", -2200, "lifestyle", 0],
        ["11", "Grocery authorization", 4800, "food", 1],
      ]) {
        db.prepare(
          "INSERT INTO transactions (id,source,date,description,amount_cents,currency,category_id,pending,reviewed) VALUES (?,'demo',?,?,?,?,?,?,1)",
        ).run(
          randomUUID(),
          `${m}-${day}`,
          description,
          amount,
          currency,
          category,
          pending,
        );
      }
      db.prepare("INSERT INTO investments VALUES (?,?,?,?,?,?)").run(
        "demo-portfolio",
        "Example investment portfolio",
        1824500,
        currency,
        "demo",
        new Date().toISOString(),
      );
      db.prepare("INSERT INTO meta VALUES (?,?)").run("seeded", "true");
    });
  }
  return {
    db,
    atomic,
    connection,
    saveConnection,
    summary,
    upsertPlaid,
    budget,
    seed,
    close: () => db.close(),
  };
}
