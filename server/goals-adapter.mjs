import { goalsService } from "./goals.mjs";
export function workspaceGoals(store, currency) {
  const convert = (t) =>
    t
      ? {
          id: t.id,
          date: t.date,
          description: t.description,
          amount_cents: t.amount_cents,
          currency: t.currency,
          pending: Boolean(t.pending),
          removed: Boolean(t.removed),
          transfer: t.kind === "transfer",
          eligible: t.kind === "expense",
          method: null,
        }
      : null;
  // This adapter has transactions but no cash-balance or card-account feed.
  // Cash must be confirmed separately. Users identify cash versus card purchases;
  // both keep a payment hold until explicitly settled.
  return goalsService(store.db, {
    currency,
    transaction: (id) =>
      convert(
        store.db
          .prepare(
            "SELECT t.*,c.kind FROM transactions t JOIN categories c ON c.id=t.category_id WHERE t.id=?",
          )
          .get(id),
      ),
    transactions: (q) =>
      store.db
        .prepare(
          "SELECT t.*,c.kind FROM transactions t JOIN categories c ON c.id=t.category_id WHERE t.removed=0 AND t.pending=0 AND t.amount_cents>0 AND c.kind='expense' AND t.description LIKE ? ORDER BY t.date DESC LIMIT 50",
        )
        .all(`%${q}%`)
        .map(convert),
  });
}
