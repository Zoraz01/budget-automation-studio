import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { openStore } from "../server/store.mjs";
test("documented daily check opens only the supplied synthetic DB and flags stale ingestion", () => {
  const dir = mkdtempSync(join(tmpdir(), "bas-daily-check-")),
    database = join(dir, "demo.sqlite");
  try {
    const s = openStore(database, "b".repeat(64), "USD");
    s.seed("2027-01");
    s.saveConnection("example", "plaid", { access_token: "fixture" });
    s.db
      .prepare("UPDATE connections SET status='current',synced_at=?")
      .run(new Date().toISOString());
    s.close();
    const plan = join(dir, "plan.json");
    writeFileSync(
      plan,
      JSON.stringify({
        today: new Date().toISOString().slice(0, 10),
        cashCents: 200000,
        observedAt: new Date().toISOString(),
        dailySpendCents: 1000,
        events: [],
      }),
    );
    const before = readFileSync(database);
    const run = () =>
      spawnSync(
        process.execPath,
        [
          resolve("scripts/daily-financial-check.mjs"),
          "--database",
          database,
          "--plan",
          plan,
        ],
        { env: {}, encoding: "utf8" },
      );
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.connections[0].freshness, "current");
    assert.equal(report.plan.projectedHeadroomCents, 170000);
    assert.equal(report.sync, null);
    assert.doesNotMatch(result.stdout, /access_token|fixture/);
    assert.deepEqual(readFileSync(database), before);
    const stale = openStore(database, "b".repeat(64), "USD");
    stale.db
      .prepare("UPDATE connections SET synced_at='2020-01-01T00:00:00Z'")
      .run();
    stale.close();
    assert.equal(run().status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
