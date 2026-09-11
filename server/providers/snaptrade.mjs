import { Snaptrade, SnaptradeAuth } from "snaptrade-typescript-sdk";
import { randomUUID } from "node:crypto";
import { providerCents, InputError } from "../domain.mjs";
import { ProviderError } from "./plaid.mjs";
export function snaptradeClient(config) {
  const auth = {
    clientId: config.env.SNAPTRADE_CLIENT_ID,
    consumerKey: config.env.SNAPTRADE_CONSUMER_KEY,
  };
  return new Snaptrade({
    auth:
      config.snapMode === "personal"
        ? SnaptradeAuth.personalApiKey(auth)
        : SnaptradeAuth.commercialApiKey(auth),
    baseOptions: { timeout: 20000, maxRedirects: 0 },
  });
}
export async function snapCredentials(store, mode, client, register = false) {
  if (mode === "personal") return {};
  const existing = store.connection("snaptrade");
  if (existing) return existing.credentials;
  if (!register) throw new InputError("Connect SnapTrade before syncing");
  // Persist the registration ID before the request so a timeout cannot create
  // a new external user on every retry. Recovery instructions are in SETUP.md.
  let userId = store.db
    .prepare("SELECT value FROM meta WHERE key='snaptrade_user_id'")
    .get()?.value;
  if (!userId) {
    userId = randomUUID();
    store.db
      .prepare("INSERT INTO meta VALUES (?,?)")
      .run("snaptrade_user_id", userId);
  }
  const { data } = await client.authentication.registerSnapTradeUser({
    userId,
  });
  if (!data.userSecret) throw new ProviderError();
  const credentials = { userId, userSecret: data.userSecret };
  store.saveConnection("snaptrade", "snaptrade", credentials);
  return credentials;
}
export async function connectSnaptrade(store, config, client) {
  const credentials = await snapCredentials(
    store,
    config.snapMode,
    client,
    true,
  );
  const { data } = await client.authentication.loginSnapTradeUser({
    ...credentials,
    connectionType: "read",
  });
  const url = new URL(data.redirectURI);
  if (
    url.protocol !== "https:" ||
    !(
      url.hostname === "snaptrade.com" ||
      url.hostname.endsWith(".snaptrade.com")
    )
  )
    throw new ProviderError();
  if (config.snapMode === "personal")
    store.saveConnection("snaptrade", "snaptrade", {});
  return { url: url.href };
}
export function normalizeAccount(a, currency) {
  if (typeof a.id !== "string" || !a.id) throw new ProviderError();
  const total = a.balance?.total;
  const amount = total?.amount;
  const code = total?.currency;
  // Missing or foreign-currency values remain unavailable, never zero.
  const available =
    typeof amount === "number" && Number.isFinite(amount) && code === currency;
  return {
    id: a.id,
    name: String(a.name || "Investment account").slice(0, 160),
    value: available ? providerCents(amount) : null,
    currency: code || null,
    status: available ? "current" : "unavailable",
  };
}
export async function syncSnaptrade(store, config, client) {
  const credentials = await snapCredentials(store, config.snapMode, client);
  try {
    const { data } =
      await client.accountInformation.listUserAccounts(credentials);
    if (!Array.isArray(data)) throw new ProviderError();
    const accounts = data.map((a) => normalizeAccount(a, config.currency));
    const now = new Date().toISOString();
    store.atomic(() => {
      store.db.prepare("UPDATE investments SET status='stale'").run();
      for (const a of accounts)
        store.db
          .prepare(
            `INSERT INTO investments VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,value_cents=excluded.value_cents,currency=excluded.currency,status=excluded.status,synced_at=excluded.synced_at`,
          )
          .run(a.id, a.name, a.value, a.currency, a.status, now);
      store.db
        .prepare(
          "UPDATE connections SET status='current',synced_at=? WHERE id='snaptrade'",
        )
        .run(now);
    });
    return { accounts: accounts.length };
  } catch (e) {
    store.db
      .prepare("UPDATE connections SET status='error' WHERE id='snaptrade'")
      .run();
    store.db.prepare("UPDATE investments SET status='stale'").run();
    throw e;
  }
}
