import test from "node:test";
import assert from "node:assert/strict";
import { openStore } from "../server/store.mjs";
import {
  syncPlaid,
  ProviderError,
  normalizeTransaction,
  plaidClient,
} from "../server/providers/plaid.mjs";
import {
  normalizeAccount,
  snapCredentials,
  connectSnaptrade,
  syncSnaptrade,
  snaptradeClient,
} from "../server/providers/snaptrade.mjs";
const key = "b".repeat(64),
  id = "plaid:fixture";
function setup() {
  const s = openStore(":memory:", key, "USD");
  s.saveConnection(id, "plaid", { access_token: "fixture-token" });
  return s;
}
const row = (id, amount = 12.34) => ({
  transaction_id: id,
  date: "2026-05-04",
  name: "Fixture shop",
  amount,
  iso_currency_code: "USD",
  pending: false,
});
const page = (added = [], more = false, cursor = "cursor-1", extra = {}) => ({
  added,
  modified: [],
  removed: [],
  has_more: more,
  next_cursor: cursor,
  ...extra,
});
test("Plaid sync batches pages, idempotently upserts, and applies removals", async () => {
  const s = setup();
  try {
    let call = 0;
    await syncPlaid(s, id, "USD", async () =>
      ++call === 1
        ? page([row("a")], true)
        : page([row("b")], false, "cursor-2"),
    );
    assert.equal(s.connection(id).cursor, "cursor-2");
    assert.equal(
      s.db.prepare("SELECT count(*) AS n FROM transactions").get().n,
      2,
    );
    await syncPlaid(s, id, "USD", async () =>
      page([], false, "cursor-3", {
        modified: [row("b", 99)],
        removed: [{ transaction_id: "a" }],
      }),
    );
    assert.equal(
      s.db
        .prepare("SELECT amount_cents FROM transactions WHERE id=?")
        .get(`${id}:b`).amount_cents,
      9900,
    );
    assert.equal(
      s.db.prepare("SELECT removed FROM transactions WHERE id=?").get(`${id}:a`)
        .removed,
      1,
    );
  } finally {
    s.close();
  }
});
test("Plaid does not commit partial pages or cursor on a later-page failure", async () => {
  const s = setup();
  try {
    let call = 0;
    await assert.rejects(
      syncPlaid(s, id, "USD", async () => {
        if (++call === 1) return page([row("a")], true);
        throw new ProviderError();
      }),
    );
    assert.equal(s.connection(id).cursor, null);
    assert.equal(
      s.db.prepare("SELECT count(*) AS n FROM transactions").get().n,
      0,
    );
    assert.equal(s.connection(id).status, "error");
  } finally {
    s.close();
  }
});
test("Plaid pagination mutation restarts at the original cursor", async () => {
  const s = setup();
  try {
    const cursors = [];
    let call = 0;
    await syncPlaid(s, id, "USD", async (path, input) => {
      cursors.push(input.cursor);
      call++;
      if (call === 1) return page([row("discard")], true);
      if (call === 2)
        throw new ProviderError("TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION");
      return page([row("final")], false, "final-cursor");
    });
    assert.deepEqual(cursors, [undefined, "cursor-1", undefined]);
    assert.equal(
      s.db.prepare("SELECT count(*) AS n FROM transactions").get().n,
      1,
    );
    assert.ok(
      s.db.prepare("SELECT id FROM transactions WHERE id=?").get(`${id}:final`),
    );
  } finally {
    s.close();
  }
});
test("Plaid rejects mixed-currency imports atomically", async () => {
  const s = setup();
  try {
    await assert.rejects(
      syncPlaid(s, id, "USD", async () =>
        page([row("usd"), { ...row("eur"), iso_currency_code: "EUR" }]),
      ),
      /currency/,
    );
    assert.equal(s.connection(id).cursor, null);
    assert.equal(
      s.db.prepare("SELECT count(*) AS n FROM transactions").get().n,
      0,
    );
  } finally {
    s.close();
  }
});
test("Plaid preserves user category edits across syncs", async () => {
  const s = setup();
  try {
    await syncPlaid(s, id, "USD", async () => page([row("a")]));
    s.db.prepare("UPDATE transactions SET category_id='food',reviewed=1").run();
    await syncPlaid(s, id, "USD", async () =>
      page([], false, "new", { modified: [row("a", 50)] }),
    );
    assert.equal(
      s.db.prepare("SELECT category_id FROM transactions").get().category_id,
      "food",
    );
  } finally {
    s.close();
  }
});
test("a loan payment remains reviewable spending instead of being silently excluded", () => {
  assert.equal(
    normalizeTransaction(
      { ...row("a"), personal_finance_category: { primary: "LOAN_PAYMENTS" } },
      "USD",
      id,
    ).category_id,
    "uncategorized",
  );
});
test("Plaid errors do not retain or print response secrets", async () => {
  const client = plaidClient({ plaidEnv: "sandbox", env: {} }, async () => ({
    ok: false,
    json: async () => ({ error_code: "INVALID_CREDENTIALS", secret: "leak" }),
  }));
  await assert.rejects(
    client("/fixture", {}),
    (e) =>
      e.message === "Provider request failed" &&
      !JSON.stringify(e).includes("leak"),
  );
});
test("SnapTrade null and foreign balances remain unavailable; zero is valid", () => {
  assert.equal(
    normalizeAccount(
      { id: "a", balance: { total: { amount: null, currency: "USD" } } },
      "USD",
    ).value,
    null,
  );
  assert.equal(
    normalizeAccount(
      { id: "a", balance: { total: { amount: 12, currency: "EUR" } } },
      "USD",
    ).value,
    null,
  );
  assert.equal(
    normalizeAccount(
      { id: "a", balance: { total: { amount: 0, currency: "USD" } } },
      "USD",
    ).value,
    0,
  );
});
test("SnapTrade SDK constructs both explicit auth modes", () => {
  for (const snapMode of ["personal", "commercial"])
    assert.ok(
      snaptradeClient({
        snapMode,
        env: {
          SNAPTRADE_CLIENT_ID: "fixture",
          SNAPTRADE_CONSUMER_KEY: "fixture",
        },
      }).accountInformation,
    );
});
test("SnapTrade personal auth omits user credentials and never registers", async () => {
  const s = setup();
  try {
    assert.deepEqual(
      await snapCredentials(
        s,
        "personal",
        {
          authentication: {
            registerSnapTradeUser: () => {
              throw new Error("Must not register");
            },
          },
        },
        true,
      ),
      {},
    );
  } finally {
    s.close();
  }
});
test("SnapTrade portal requests read-only access and rejects unexpected hosts", async () => {
  const s = setup();
  try {
    let parameters;
    const client = {
      authentication: {
        loginSnapTradeUser: async (input) => {
          parameters = input;
          return { data: { redirectURI: "https://app.snaptrade.com/fixture" } };
        },
      },
    };
    const result = await connectSnaptrade(s, { snapMode: "personal" }, client);
    assert.equal(parameters.connectionType, "read");
    assert.ok(!("userId" in parameters));
    assert.match(result.url, /snaptrade/);
    client.authentication.loginSnapTradeUser = async () => ({
      data: { redirectURI: "https://example.org/fixture" },
    });
    await assert.rejects(connectSnaptrade(s, { snapMode: "personal" }, client));
  } finally {
    s.close();
  }
});
test("SnapTrade missing accounts are stale, and a failed refresh preserves values", async () => {
  const s = setup();
  s.saveConnection("snaptrade", "snaptrade", {});
  try {
    const config = { snapMode: "personal", currency: "USD" };
    const client = {
      accountInformation: {
        listUserAccounts: async () => ({
          data: [
            { id: "one", balance: { total: { amount: 123, currency: "USD" } } },
            { id: "two", balance: { total: { amount: 456, currency: "USD" } } },
          ],
        }),
      },
    };
    await syncSnaptrade(s, config, client);
    client.accountInformation.listUserAccounts = async () => ({
      data: [
        { id: "one", balance: { total: { amount: 130, currency: "USD" } } },
      ],
    });
    await syncSnaptrade(s, config, client);
    assert.equal(
      s.db.prepare("SELECT status FROM investments WHERE id='two'").get()
        .status,
      "stale",
    );
    client.accountInformation.listUserAccounts = async () => {
      throw new Error("offline");
    };
    await assert.rejects(syncSnaptrade(s, config, client));
    assert.equal(
      s.db.prepare("SELECT value_cents FROM investments WHERE id='one'").get()
        .value_cents,
      13000,
    );
    assert.equal(
      s.db.prepare("SELECT status FROM investments WHERE id='one'").get()
        .status,
      "stale",
    );
  } finally {
    s.close();
  }
});
test("provider transfer labels alone never prove a movement is between owned accounts", () => {
  assert.equal(
    normalizeTransaction(
      { ...row("a"), personal_finance_category: { primary: "TRANSFER_OUT" } },
      "USD",
      id,
    ).category_id,
    "uncategorized",
  );
});
