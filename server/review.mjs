import { cents, date, text, InputError } from "./domain.mjs";

export class ReviewError extends InputError {
  constructor(message, status = 409) {
    super(message);
    this.status = status;
  }
}

// Compare the displayed record and change it in one SQLite transaction. Source
// identity, currency and provider-pending state are never writable here.
export function reviewTransaction(store, input) {
  const id = text(input.id, 300);
  if (typeof input.approve !== "boolean")
    throw new InputError("Choose whether to save or approve");
  const expected = input.expected;
  const keys = [
    "date",
    "description",
    "amount_cents",
    "category_id",
    "pending",
    "reviewed",
  ];
  if (
    !expected ||
    typeof expected !== "object" ||
    Array.isArray(expected) ||
    keys.some((key) => expected[key] === undefined)
  )
    throw new InputError("A displayed transaction snapshot is required");
  if (
    input.edits !== undefined &&
    (!input.edits ||
      typeof input.edits !== "object" ||
      Array.isArray(input.edits))
  )
    throw new InputError("Expected transaction edits");
  const edits = input.edits || {};
  if (
    Object.keys(edits).some(
      (key) => !["date", "description", "amount", "category_id"].includes(key),
    )
  )
    throw new InputError("Unsupported transaction field");
  return store.atomic(() => {
    const current = store.db
      .prepare("SELECT * FROM transactions WHERE id=? AND removed=0")
      .get(id);
    if (!current)
      throw new ReviewError(
        "This transaction is no longer available. Refresh the view.",
      );
    if (current.pending)
      throw new ReviewError(
        "Wait until the transaction is posted before reviewing it.",
      );
    if (current.reviewed || keys.some((key) => current[key] !== expected[key]))
      throw new ReviewError(
        "This transaction changed. Refresh the view before reviewing it again.",
      );
    const category =
      edits.category_id === undefined
        ? current.category_id
        : text(edits.category_id);
    if (!store.db.prepare("SELECT id FROM categories WHERE id=?").get(category))
      throw new InputError("Unknown category");
    const next = {
      date: edits.date === undefined ? current.date : date(edits.date),
      description:
        edits.description === undefined
          ? current.description
          : text(edits.description, 160),
      amount:
        edits.amount === undefined ? current.amount_cents : cents(edits.amount),
      category,
    };
    store.db
      .prepare(
        "UPDATE transactions SET date=?,description=?,amount_cents=?,category_id=?,reviewed=? WHERE id=?",
      )
      .run(
        next.date,
        next.description,
        next.amount,
        next.category,
        input.approve ? 1 : 0,
        id,
      );
    return store.db
      .prepare(
        "SELECT id,source,date,description,amount_cents,currency,category_id,pending,reviewed FROM transactions WHERE id=?",
      )
      .get(id);
  });
}
