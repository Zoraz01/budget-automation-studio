/* Synthetic design prototype. No network, provider calls or financial writes. */
(() => {
  const root = document.getElementById("quick-review");
  if (!root) return;
  const $ = (selector) => root.querySelector(selector);
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const money = (cents) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  const dateLabel = (value) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(value + "T12:00:00Z"));
  const fixtures = [
    {
      id: "demo-kitchen",
      description: "Neighborhood Kitchen",
      cents: 8400,
      date: "2026-09-10",
      category: "Dining",
      account: "Example card",
      direction: "Expense",
      transfer: false,
    },
    {
      id: "demo-market",
      description: "Corner Market",
      cents: 6200,
      date: "2026-09-09",
      category: "Groceries",
      account: "Example card",
      direction: "Expense",
      transfer: false,
    },
    {
      id: "demo-refund",
      description: "Clothing refund",
      cents: 2200,
      date: "2026-09-07",
      category: "Other",
      account: "Example card",
      direction: "Refund",
      transfer: false,
      attention: "Refund link needs a check",
    },
  ];
  let queue = fixtures.map((item) => ({ ...item }));
  let selected = queue[0].id;
  let message = "";
  let lastFocus = null;
  let dialogItemId = null;
  const current = () => queue.find((item) => item.id === selected) || queue[0];
  const option = (value, chosen) =>
    `<option${value === chosen ? " selected" : ""}>${esc(value)}</option>`;
  const action = (label, name, cls = "", id = current()?.id) =>
    `<button type="button" class="${cls}" data-action="${name}"${id ? ` data-item="${esc(id)}"` : ""}>${label}</button>`;

  function render() {
    const item = current();
    $("[data-brand]").textContent = root.dataset.product || "Finance";
    $("#quick-review-main").innerHTML =
      `<div class="review-heading"><div><h1>Review</h1><small>${queue.length} ${queue.length === 1 ? "purchase" : "purchases"} left</small></div>${queue.length ? action("Bulk approval", "bulk", "quiet") : ""}</div><p class="review-status" role="status" aria-live="polite">${esc(message)}</p>${
        item
          ? `
      <section class="card review-summary" aria-label="Selected purchase">
        <small>${dateLabel(item.date)} · ${esc(item.direction)}</small>
        <h2>${esc(item.description)}</h2>
        <div class="review-amount">${money(item.cents)}</div>
        <dl class="review-facts">
          <div><dt>Category</dt><dd>${item.transfer ? "Transfer" : esc(item.category)}<small>${item.transfer ? "Between your own accounts" : item.edited ? "Edited" : "Suggested"}</small></dd></div>
          <div><dt>Account</dt><dd>${esc(item.account)}</dd></div>
        </dl>
        ${item.attention ? `<p class="notice">${esc(item.attention)}. Approval alone does not link it.</p>` : ""}
        <div class="review-actions">${action("Edit", "edit")}${action("Approve", "approve", "primary")}</div>
        <details class="review-options"><summary>More options</summary><div class="review-option-links">
          <a href="mobile-concept.html#review" data-example="Category split">Split categories</a>
          <a href="mobile-concept.html#activity" data-example="Refund linking">Link a refund</a>
          <a href="mobile-concept.html#sharing" data-example="Shared expense">Split with friends</a>
          ${action("Reject purchase", "reject", "danger")}
        </div></details>
      </section>
      ${
        queue.length > 1
          ? `<section class="review-next" aria-label="Other purchases"><h2>Up next</h2>${queue
              .filter((next) => next.id !== item.id)
              .map(
                (next) =>
                  `<button type="button" class="list-button" data-action="select" data-item="${next.id}"><span class="grow"><strong>${esc(next.description)}</strong><small>${esc(next.attention || next.category)}</small></span><span>${money(next.cents)}</span></button>`,
              )
              .join("")}</section>`
          : ""
      }
    `
          : `<section class="card review-complete"><h2>All reviewed</h2><p>Your demo queue is clear.</p>${action("Restart demo", "restart", "primary", null)}</section>`
      }`;
  }

  function openDialog(title, content) {
    lastFocus = document.activeElement;
    $("#review-dialog-title").textContent = title;
    $("#review-dialog-body").innerHTML = content;
    $("#review-editor").showModal();
  }
  function closeDialog() {
    $("#review-editor").close();
    if (lastFocus?.isConnected) lastFocus.focus();
  }
  function finish(id, verb = "Approved") {
    const item = queue.find((row) => row.id === id);
    if (!item) return;
    message = `${verb} ${item.description} · ${money(item.cents)} · ${item.transfer ? "Transfer" : item.category}`;
    queue = queue.filter((row) => row.id !== id);
    selected = queue[0]?.id;
    render();
    $('[data-action="approve"]')?.focus({ preventScroll: true });
  }
  function edit() {
    const item = current();
    if (!item) return;
    dialogItemId = item.id;
    openDialog(
      "Edit purchase",
      `<form id="review-edit-form"><div class="form-grid">
      <label>Description<input name="description" value="${esc(item.description)}" required maxlength="200" /></label>
      <div class="field-row"><label>Amount<input name="amount" type="number" min="0" step="0.01" inputmode="decimal" value="${(item.cents / 100).toFixed(2)}" required /></label><label>Date<input name="date" type="date" value="${item.date}" required /></label></div>
      <label>Category<select name="category" aria-label="Category">${["Dining", "Groceries", "Other"].map((value) => option(value, item.category)).join("")}</select></label>
      <label>Account<select name="account" aria-label="Account">${["Example card", "Example checking"].map((value) => option(value, item.account)).join("")}</select></label>
      <label class="check"><input name="transfer" type="checkbox"${item.transfer ? " checked" : ""} />Transfer between my own accounts</label>
      <p class="review-form-error" role="alert" id="review-edit-error" hidden></p>
    </div><div class="form-actions"><button type="submit" name="intent" value="save">Save changes</button><button type="submit" class="primary" name="intent" value="approve">Save &amp; approve</button></div></form>`,
    );
  }
  function bulk() {
    const eligible = queue.filter((item) => !item.attention);
    openDialog(
      "Approve eligible purchases?",
      `<ul class="review-bulk-list">${eligible.map((item) => `<li>${esc(item.description)} · ${money(item.cents)}<small>${esc(item.transfer ? "Transfer" : item.category)} · ${esc(item.account)}</small></li>`).join("")}</ul><p>${queue.length - eligible.length} ${queue.length - eligible.length === 1 ? "purchase needs" : "purchases need"} an individual check.</p>${eligible.length ? action(`Approve ${eligible.length} purchases`, "confirm-bulk", "primary full", null) : ""}`,
    );
  }

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || event.detail > 1) return;
    const id = button.dataset.item;
    if (id && !queue.some((item) => item.id === id)) return;
    switch (button.dataset.action) {
      case "approve":
        if (current()?.id === id) finish(id);
        break;
      case "edit":
        edit();
        break;
      case "select":
        selected = id;
        message = "";
        render();
        break;
      case "close-dialog":
        closeDialog();
        break;
      case "bulk":
        bulk();
        break;
      case "confirm-bulk": {
        const count = queue.filter((item) => !item.attention).length;
        closeDialog();
        queue = queue.filter((item) => item.attention);
        selected = queue[0]?.id;
        message = `Approved ${count} demo purchases`;
        render();
        break;
      }
      case "reject":
        dialogItemId = id;
        openDialog(
          "Reject this purchase?",
          `<p>${esc(current().description)} · ${money(current().cents)}</p><p>Remove it from the demo review queue?</p>${action("Confirm rejection", "confirm-reject", "danger full", id)}`,
        );
        break;
      case "confirm-reject":
        closeDialog();
        finish(id, "Rejected");
        break;
      case "restart":
        queue = fixtures.map((item) => ({ ...item }));
        selected = queue[0].id;
        message = "";
        render();
        break;
    }
  });
  root.addEventListener("submit", (event) => {
    if (event.target.id !== "review-edit-form") return;
    event.preventDefault();
    const form = new FormData(event.target);
    const value = form.get("amount").trim();
    const cents = Math.round(Number(value) * 100);
    const description = form.get("description").trim();
    if (
      !/^\d+(\.\d{1,2})?$/.test(value) ||
      !Number.isSafeInteger(cents) ||
      !description
    ) {
      $("#review-edit-error").hidden = false;
      $("#review-edit-error").textContent =
        "Enter a description and an amount with no more than two decimal places.";
      return;
    }
    const item = queue.find((row) => row.id === dialogItemId);
    if (!item) {
      closeDialog();
      return;
    }
    Object.assign(item, {
      description,
      cents,
      date: form.get("date"),
      category: form.get("category"),
      account: form.get("account"),
      transfer: form.has("transfer"),
      edited: true,
    });
    closeDialog();
    if (event.submitter?.value === "approve") finish(item.id);
    else {
      message = "Changes saved. Ready to approve.";
      render();
      $('[data-action="edit"]')?.focus();
    }
  });
  $("#review-editor").addEventListener("cancel", () => {
    if (lastFocus?.isConnected) lastFocus.focus();
  });
  render();
})();
