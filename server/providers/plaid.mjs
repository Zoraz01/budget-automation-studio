import { InputError, date, providerCents } from "../domain.mjs";
export class ProviderError extends Error {
  constructor(code = "PROVIDER_UNAVAILABLE") {
    super("Provider request failed");
    this.code = code;
  }
}
export function plaidClient(config, fetcher = fetch) {
  return async function request(path, body) {
    const response = await fetcher(
      `https://${config.plaidEnv}.plaid.com${path}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          client_id: config.env.PLAID_CLIENT_ID,
          secret: config.env.PLAID_SECRET,
          ...body,
        }),
      },
    );
    const data = await response.json();
    if (!response.ok) throw new ProviderError(data.error_code);
    return data;
  };
}
export function normalizeTransaction(t, currency, connectionId) {
  if (t.iso_currency_code !== currency)
    throw new InputError(
      "Provider currency differs from this budget. Sync was not saved.",
    );
  if (!t.transaction_id || typeof t.name !== "string")
    throw new InputError("Invalid provider transaction");
  const primary = t.personal_finance_category?.primary || "";
  return {
    id: `${connectionId}:${t.transaction_id}`,
    date: date(t.date),
    description: t.name.slice(0, 160),
    amount_cents: providerCents(t.amount),
    currency,
    pending: !!t.pending,
    category_id: primary === "INCOME" ? "income" : "uncategorized",
  };
}
export async function syncPlaid(store, connectionId, currency, request) {
  const connection = store.connection(connectionId);
  if (!connection || connection.provider !== "plaid")
    throw new InputError("Unknown Plaid connection");
  const originalCursor = connection.cursor || undefined;
  // Stage every page, restart from the original cursor on mutation, commit once.
  for (let attempt = 0; attempt < 3; attempt++) {
    let cursor = originalCursor;
    const pages = [];
    try {
      for (let page = 0; page < 100; page++) {
        const result = await request("/transactions/sync", {
          access_token: connection.credentials.access_token,
          cursor,
          count: 500,
        });
        if (
          !Array.isArray(result.added) ||
          !Array.isArray(result.modified) ||
          !Array.isArray(result.removed) ||
          typeof result.next_cursor !== "string" ||
          typeof result.has_more !== "boolean"
        )
          throw new ProviderError();
        pages.push({
          rows: [...result.added, ...result.modified].map((t) =>
            normalizeTransaction(t, currency, connectionId),
          ),
          removed: result.removed,
        });
        cursor = result.next_cursor;
        if (!result.has_more) break;
        if (page === 99) throw new ProviderError("PAGINATION_LIMIT");
      }
      store.atomic(() => {
        for (const page of pages) {
          for (const t of page.rows) store.upsertPlaid(t, connectionId);
          for (const t of page.removed)
            store.db
              .prepare(
                "UPDATE transactions SET removed=1 WHERE id=? AND connection_id=?",
              )
              .run(`${connectionId}:${t.transaction_id}`, connectionId);
        }
        store.db
          .prepare(
            "UPDATE connections SET cursor=?,synced_at=?,status='current' WHERE id=?",
          )
          .run(cursor, new Date().toISOString(), connectionId);
      });
      return {
        pages: pages.length,
        changed: pages.reduce(
          (s, p) => s + p.rows.length + p.removed.length,
          0,
        ),
      };
    } catch (e) {
      if (
        e.code === "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION" &&
        attempt < 2
      )
        continue;
      store.db
        .prepare("UPDATE connections SET status='error' WHERE id=?")
        .run(connectionId);
      throw e;
    }
  }
}
