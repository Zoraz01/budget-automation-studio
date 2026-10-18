// Run from the BAS checkout. No provider or AI calls unless --sync is supplied.
import { DatabaseSync } from "node:sqlite";
import { readFileSync, openSync, closeSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { planCash } from "../server/cash-plan.mjs";

export async function syncConnections(store, config, request) {
  const { syncPlaid, plaidClient } =
    await import("../server/providers/plaid.mjs");
  if (config.mode !== "personal" || !config.plaid)
    throw new Error("Configured personal Plaid mode is required for --sync");
  const results = [];
  for (const row of store.db
    .prepare("SELECT id FROM connections WHERE provider='plaid'")
    .all()) {
    try {
      await syncPlaid(
        store,
        row.id,
        config.currency,
        request || plaidClient(config),
      );
      results.push({ status: "current" });
    } catch {
      results.push({ status: "failed" });
    }
  }
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = (name) => {
    const i = args.indexOf(name);
    return i < 0 ? null : args[i + 1];
  };
  const database = fileArg("--database");
  if (!database)
    throw new Error("Use --database data/demo.sqlite or your own BAS database");
  let sync = null;
  if (args.includes("--sync")) {
    const { configuration } = await import("../server/config.mjs");
    const { openStore } = await import("../server/store.mjs");
    const config = configuration();
    if (config.mode !== "personal" || !config.plaid)
      throw new Error("Configured personal Plaid mode is required for --sync");
    if (resolve(database) !== config.database)
      throw new Error("--sync requires the configured personal database");
    // A failed process leaves a lock for operator review; never delete another runner's lock.
    const lock = `${database}.daily-check.lock`,
      fd = openSync(lock, "wx", 0o600);
    let store;
    try {
      store = openStore(database, config.vaultKey, config.currency);
      sync = await syncConnections(store, config);
    } finally {
      store?.close();
      closeSync(fd);
      unlinkSync(lock);
    }
  }
  const db = new DatabaseSync(database, { readOnly: true });
  try {
    const connections = db
      .prepare("SELECT provider,status,synced_at FROM connections")
      .all()
      .map((c) => ({
        ...c,
        freshness:
          c.status !== "current"
            ? c.status
            : !c.synced_at ||
                Date.now() - Date.parse(c.synced_at) > 26 * 3600000 ||
                !Number.isFinite(Date.parse(c.synced_at))
              ? "stale"
              : "current",
      }));
    const planFile = fileArg("--plan");
    const plan = planFile
      ? planCash({
          ...JSON.parse(readFileSync(planFile, "utf8")),
          coverageComplete: false,
        })
      : null;
    console.log(
      JSON.stringify(
        {
          asOf: new Date().toISOString(),
          sync,
          connections,
          plan,
          note: "Provider-cached delivery is not bank-side freshness. A plan requires separately verified cash and dated obligations; period cash flow and investments are not spendable cash.",
        },
        null,
        2,
      ),
    );
    if (
      sync?.some((r) => r.status === "failed") ||
      connections.some((c) => c.freshness !== "current")
    )
      process.exitCode = 1;
  } finally {
    db.close();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main().catch(() => {
    console.error(
      "Daily check failed. Check arguments, database access, credentials, and any existing lock. No automatic retry was made.",
    );
    process.exitCode = 1;
  });
