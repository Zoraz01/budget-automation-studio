export const reviewSnapshot = (transaction) =>
  Object.fromEntries(
    [
      "date",
      "description",
      "amount_cents",
      "category_id",
      "pending",
      "reviewed",
    ].map((key) => [key, transaction[key]]),
  );

export function reviewPane(
  rows,
  categories,
  {
    selectedId,
    disabled,
    error,
    refreshRequired,
    filtered,
    searchValue,
    escape,
    money,
  },
) {
  const transaction = rows.find((row) => row.id === selectedId) || rows[0];
  const search = `<label class="search review-queue-search"><span class="sr-only">Search transactions</span><input id="search" value="${escape(searchValue || "")}" placeholder="Search purchases…" type="search"></label>`;
  if (!transaction)
    return `<div class="quick-review-layout"><section class="card review-empty"><h2>${filtered ? "No matches" : "All reviewed"}</h2><p>${filtered ? "No purchases match this search." : "No posted transactions need review in this view."}</p></section><section class="review-next">${search}</section></div>`;
  const category = categories.find(
    (item) => item.id === transaction.category_id,
  );
  const kind =
    category?.kind === "transfer"
      ? "Transfer"
      : category?.kind === "income"
        ? "Income"
        : transaction.amount_cents < 0
          ? "Refund"
          : "Expense";
  const source =
    { manual: "Manual entry", demo: "Demo entry", plaid: "Bank import" }[
      transaction.source
    ] || "Imported activity";
  return `<div class="quick-review-layout"><section class="card review-purchase" aria-label="Selected purchase"><p class="review-date">${escape(transaction.date)} · ${kind}</p><h2>${escape(transaction.description)}</h2><div class="review-amount">${money(Math.abs(transaction.amount_cents))}</div><dl class="review-facts"><div><dt>Category</dt><dd>${escape(category?.name || "Uncategorized")}</dd></div><div><dt>Source</dt><dd>${source}</dd></div></dl>${error ? `<div class="review-error" role="alert"><p>${escape(error)}</p>${refreshRequired ? '<button data-action="refresh-review">Refresh status</button>' : ""}</div>` : ""}<div class="review-actions"><button data-edit-review="${escape(transaction.id)}" ${disabled || refreshRequired ? "disabled" : ""}>Edit</button><button class="primary review-approve" data-review="${escape(transaction.id)}" ${disabled || refreshRequired ? "disabled" : ""}>${disabled ? "Working…" : "Approve"}</button></div></section><section class="review-next" aria-label="Other purchases"><h2>Up next</h2>${search}${
    rows
      .filter((row) => row.id !== transaction.id)
      .map(
        (row) =>
          `<button class="review-next-row" data-select-review="${escape(row.id)}" ${disabled ? "disabled" : ""}><span><strong>${escape(row.description)}</strong><small>${escape(row.date)} · ${escape(categories.find((item) => item.id === row.category_id)?.name || "Uncategorized")}</small></span><b>${money(Math.abs(row.amount_cents))}</b></button>`,
      )
      .join("") || '<p class="note">This is the last purchase in this view.</p>'
  }</section></div>`;
}

export function reviewForm(transaction, categories, { currency, escape }) {
  return `<form id="review-edit-form" class="form-stack" data-id="${escape(transaction.id)}"><fieldset class="review-fields"><label>Description<input name="description" maxlength="160" value="${escape(transaction.description)}" required></label><div class="field-grid"><label>Date<input name="date" type="date" value="${escape(transaction.date)}" required></label><label>Amount (${escape(currency)})<input name="amount" inputmode="decimal" type="text" pattern="-?[0-9]+([.][0-9]{1,2})?" value="${(transaction.amount_cents / 100).toFixed(2)}" required></label></div><label>Category<select name="category_id" aria-label="Category">${categories.map((category) => `<option value="${escape(category.id)}" ${category.id === transaction.category_id ? "selected" : ""}>${escape(category.name)}</option>`).join("")}</select></label><p class="note">Positive amounts are money out; negative amounts are money in. Use an expense category for a refund, or Transfers for moving your own money.</p></fieldset><div class="review-editor-actions"><button type="submit" value="save">Save changes</button><button class="primary" type="submit" value="approve">Save &amp; approve</button></div></form>`;
}
