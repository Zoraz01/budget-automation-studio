export class InputError extends Error {}
export function text(value, max = 100) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new InputError(`Enter text between 1 and ${max} characters`);
  return value.trim();
}
export function cents(value) {
  // Convert decimal strings with integer arithmetic; never add floating point money.
  const s = String(value);
  if (!/^-?\d{1,10}(\.\d{1,2})?$/.test(s))
    throw new InputError(
      "Use a decimal amount with at most two decimal places",
    );
  const [whole, part = ""] = s.replace("-", "").split(".");
  return (
    (Number(whole) * 100 + Number(part.padEnd(2, "0"))) *
    (s.startsWith("-") ? -1 : 1)
  );
}
export function providerCents(value) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    Math.abs(value) > 1e10
  )
    throw new InputError("Provider returned an invalid amount");
  const rounded = Math.round((Math.abs(value) + Number.EPSILON) * 100);
  return value < 0 ? -rounded : rounded;
}
export function month(value) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value || ""))
    throw new InputError("Month must be YYYY-MM");
  return value;
}
export function date(value) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value || "") ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value
  )
    throw new InputError("Date must be a valid YYYY-MM-DD");
  return value;
}
export function summarize(transactions, categories, budgets, selectedMonth) {
  month(selectedMonth);
  const active = transactions.filter(
    (t) => !t.removed && !t.pending && t.date.startsWith(selectedMonth),
  );
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  let incomeCents = 0,
    spentCents = 0,
    unreviewedCount = 0;
  for (const t of active) {
    const kind = categoryMap.get(t.category_id)?.kind;
    if (!t.reviewed) unreviewedCount++;
    if (kind === "income") incomeCents -= t.amount_cents;
    else if (kind !== "transfer") spentCents += t.amount_cents;
  }
  const lines = categories
    .filter((c) => c.kind === "expense")
    .map((c) => {
      const spent = active
        .filter((t) => t.category_id === c.id)
        .reduce((sum, t) => sum + t.amount_cents, 0);
      const limit =
        budgets.find((b) => b.category_id === c.id && b.month === selectedMonth)
          ?.limit_cents ?? 0;
      return {
        ...c,
        spent_cents: spent,
        limit_cents: limit,
        remaining_cents: limit - spent,
      };
    });
  return {
    month: selectedMonth,
    income_cents: incomeCents,
    spent_cents: spentCents,
    net_cents: incomeCents - spentCents,
    budget_cents: lines.reduce((s, c) => s + c.limit_cents, 0),
    unreviewed_count: unreviewedCount,
    pending_count: transactions.filter(
      (t) => !t.removed && t.pending && t.date.startsWith(selectedMonth),
    ).length,
    categories: lines,
  };
}
