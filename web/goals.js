// Shared presentation for a single authenticated workspace. No provider calls.
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  plus: "M12 5v14M5 12h14",
  back: "M19 12H5m7-7-7 7 7 7",
  chevron: "m9 5 7 7-7 7",
  repeat:
    "m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3",
  purchase: "M4 4h16v12H4zM2 20h20",
  longterm: "m3 11 9-8 9 8M5 10v11h14V10M9 21v-8h6v8",
  shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z",
  arrow: "M5 19 19 5M5 5h14v14",
  edit: "m16 3 5 5-12 12-6 1 1-6z",
  refresh: "M20 7a9 9 0 1 0 1 8M20 2v6h-6",
};
const icon = (n) =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[n] || paths.purchase}"/></svg>`;
export function mountGoals(element, request) {
  element.classList.add("goal-app");
  let data = null,
    view = "list",
    tab = "purchase",
    id = null,
    purchaseId = null,
    error = "",
    message = "",
    busy = false,
    disposed = false,
    retry = null,
    receiptOptions = [];
  const money = (c) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: data?.currency || "USD",
      maximumFractionDigits: 2,
    }).format(c / 100);
  const inputMoney = (c) => (c === null ? "" : (c / 100).toFixed(2));
  const goal = () => data?.goals.find((g) => g.id === id);
  const selectedPurchase = () =>
    data?.purchases.find((p) => p.id === purchaseId);
  const empty = (t) => `<p class="gl-empty">${esc(t)}</p>`;
  const btn = (text, action, extra = "", primary = false) =>
    `<button type="button" class="gl-button ${primary ? "gl-primary" : ""}" data-gl="${action}" ${extra}>${text}</button>`;
  const back = (dest = "list", text = "Goals") =>
    `<button type="button" class="gl-link gl-back" data-gl="${dest}">${icon("back")}${esc(text)}</button>`;
  const field = (name, label, value = "", extra = "", type = "text") =>
    `<label class="gl-field">${label}<input type="${type}" name="${name}" value="${esc(value)}" ${extra}></label>`;
  const amount = (name, label, cents, required = true) =>
    field(
      name,
      label,
      inputMoney(cents),
      `inputmode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" ${required ? "required" : ""}`,
    );
  const check = (name, text) =>
    `<label class="gl-check"><input name="${name}" type="checkbox" required><span>${esc(text)}</span></label>`;
  const actions = (text) =>
    `<p class="gl-error" role="alert" id="gl-form-error"></p><div class="gl-actions"><button class="gl-button gl-primary" type="submit">${text}</button></div>`;
  const bar = (g) =>
    g.target_cents
      ? `<progress max="${g.target_cents}" value="${Math.min(g.saved_cents, g.target_cents)}" aria-label="${esc(g.name)} savings progress"></progress>`
      : "";
  function estimate(g) {
    if (g.target_cents !== null && g.saved_cents >= g.target_cents)
      return "Target reserved";
    if (!g.monthly_cents) return "Monthly contribution off";
    if (!g.target_cents) return "Ongoing fund";
    const months = Math.ceil(
      (g.target_cents - g.saved_cents) / g.monthly_cents,
    );
    if (months > 1200) return "More than 100 years at this pace";
    const first = g.next_due || data.today;
    const d = new Date(first + "T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + months - 1);
    return `Est. ${d.toLocaleDateString(undefined, { month: "short", year: "numeric", timeZone: "UTC" })}`;
  }
  const title = (g) =>
    `<span class="gl-symbol">${icon(g.kind)}</span><span class="gl-name">${esc(g.name)}</span>`;
  function card(g) {
    const waiting = data.waiting.find((w) => w.goal_id === g.id);
    return `<button class="gl-card" type="button" data-gl="goal" data-id="${g.id}"><span class="gl-row"><span class="gl-left">${title(g)}</span>${g.priority === 1 ? '<span class="gl-badge">Next up</span>' : icon("chevron")}</span><span class="gl-values"><strong>${money(g.saved_cents)}</strong><span>${g.target_cents ? "of " + money(g.target_cents) : "set aside"}</span></span>${bar(g)}<span class="gl-foot"><span>${icon("repeat")}${money(g.monthly_cents)}/month</span><span>${estimate(g)}</span></span>${waiting ? '<span class="gl-warning gl-block">Scheduled contribution waiting</span>' : ""}</button>`;
  }
  function list() {
    const visible = data.goals.filter(
      (g) => g.kind === tab && g.status === "active",
    );
    const active = visible.filter((g) => g.saved_cents || g.monthly_cents),
      wishlist = visible.filter((g) => !g.saved_cents && !g.monthly_cents);
    const cap = data.capacity;
    return `<div class="gl-row"><h1>Goals</h1>${btn(icon("plus") + "New goal", "new", "", true)}</div><section class="gl-hero"><span class="gl-muted">Set aside across all goals</span><div class="gl-big">${money(cap.reserved_cents)}</div><span class="gl-muted">${data.goals.filter((g) => g.status === "active" && (g.saved_cents || g.monthly_cents)).length} active goals · held in your accounts</span></section><button class="gl-plan" type="button" data-gl="plan"><span class="gl-symbol gl-accent">${icon("repeat")}</span><span class="gl-grow"><strong>${money(data.monthly_total_cents)}<span class="gl-muted"> / month</span></strong><small>${data.settings.monthly_limit_cents === null ? "Set a monthly goal limit" : money(data.settings.monthly_limit_cents - data.monthly_total_cents) + " left in your monthly plan"} · ${data.settings.automatic ? "Automatic on" : "Automatic off"}</small></span>${icon("arrow")}</button><div class="gl-funding"><button class="gl-link" type="button" data-gl="funding">Funding setup ${icon("chevron")}</button><span>${cap.reason ? "Needs review" : money(cap.available_cents) + " available to earmark"}</span></div>${cap.reason ? `<p class="gl-notice">${esc(cap.reason)}</p>` : cap.shortfall_cents > 0 ? `<p class="gl-notice">Backing cash is short by ${money(cap.shortfall_cents)}. Release reservations or update protected money before contributing.</p>` : ""}${data.purchases.some((p) => p.held_cents || p.attention || !p.transaction_id) ? `<button class="gl-plan gl-holdlink" data-gl="payments" type="button"><span class="gl-grow"><strong>Purchase payments</strong><small>${money(cap.payment_holds_cents)} held · review payments and transaction links</small></span>${icon("chevron")}</button>` : ""}<div class="gl-tabs" aria-label="Goal types"><button type="button" data-gl="tab" data-tab="purchase" aria-pressed="${tab === "purchase"}">Purchases <small>${data.goals.filter((g) => g.kind === "purchase" && g.status === "active").length}</small></button><button type="button" data-gl="tab" data-tab="longterm" aria-pressed="${tab === "longterm"}">Long-term <small>${data.goals.filter((g) => g.kind === "longterm" && g.status === "active").length}</small></button></div><div class="gl-row gl-section"><h2>${tab === "purchase" ? "Saving for" : "Your funds"}</h2><small class="gl-muted">${money(active.reduce((n, g) => n + g.monthly_cents, 0))}/month</small></div><div class="gl-grid">${active.map(card).join("") || empty("Start with something you want to save for. You can add an idea without funding it yet.")}</div>${wishlist.length ? `<h2 class="gl-section">${tab === "purchase" ? "Wishlist" : "For later"}</h2>${wishlist.map((g) => `<button type="button" class="gl-wish" data-gl="goal" data-id="${g.id}">${title(g)}<small>${g.target_cents ? money(g.target_cents) : "No target"}</small>${icon("chevron")}</button>`).join("")}` : ""}<div class="gl-row gl-section">${btn("Completed & archived", "archive-list")}${btn(icon("refresh") + "Refresh", "refresh")}</div>`;
  }
  function detail() {
    const g = goal(),
      waiting = data.waiting.find((w) => w.goal_id === g.id);
    return `${back()}<div class="gl-row"><div class="gl-left">${icon(g.kind)}<h1>${esc(g.name)}</h1></div>${g.status === "active" ? btn("Edit", "edit") : ""}</div><div class="gl-hero"><span class="gl-muted">${g.status === "active" ? "Set aside" : g.status}</span><div class="gl-big">${money(g.saved_cents)}</div><span class="gl-muted">${g.target_cents ? money(Math.max(0, g.target_cents - g.saved_cents)) + " to go · " + money(g.target_cents) + " target" : "An open-ended fund"}</span>${bar(g)}</div>${g.status === "active" ? `<div class="gl-actions">${btn("Set aside", "reserve", "", true)}${btn("Release or move", "release", g.saved_cents ? "" : "disabled")}</div><section class="gl-panel"><div class="gl-row"><h2>Monthly contribution</h2>${btn("Edit", "edit")}</div><div class="gl-number">${money(g.monthly_cents)}<small class="gl-muted"> / month</small></div><div class="gl-kv"><span>Next scheduled allocation</span><strong>${data.settings.automatic && g.monthly_cents ? esc(g.next_due) : "Automatic off"}</strong></div><div class="gl-kv"><span>At this pace</span><strong>${estimate(g)}</strong></div>${g.desired_date ? `<div class="gl-kv"><span>Desired date</span><strong>${esc(g.desired_date)}</strong></div>` : ""}${waiting ? `<p class="gl-notice">${esc(waiting.reason)}</p>` : ""}</section><div class="gl-actions">${btn(g.kind === "longterm" ? "Record a purchase" : "Mark purchased", "purchase", g.saved_cents ? "" : "disabled")}${btn("Archive", "archive")}</div>${g.kind === "longterm" ? btn("Complete fund", "complete") : ""}` : btn("Restore goal", "restore")}<div class="gl-kv gl-section"><span>Backing account</span><strong>${esc(data.capacity.source?.name || "Not set")}</strong></div>${g.url ? `<a class="gl-link" href="${esc(g.url)}" target="_blank" rel="noopener noreferrer">Product link ↗</a>` : ""}${g.notes ? `<p class="gl-notes">${esc(g.notes)}</p>` : ""}<h2 class="gl-section">Activity</h2>${
      data.entries
        .filter((e) => e.goal_id === id)
        .slice(0, 25)
        .map(
          (e) =>
            `<div class="gl-kv"><span>${esc(e.memo)}<small>${new Date(e.created_at).toLocaleDateString()}</small></span><strong>${e.amount_cents > 0 ? "+" : ""}${money(e.amount_cents)}</strong></div>`,
        )
        .join("") || empty("Contributions and purchases will appear here.")
    }`;
  }
  function edit() {
    const g =
      view === "edit"
        ? goal()
        : {
            name: "",
            kind: tab,
            target_cents: null,
            monthly_cents: 0,
            priority: 0,
            desired_date: "",
            url: "",
            notes: "",
          };
    return `${back(view === "edit" ? "detail" : "list")}<h1>${view === "edit" ? "Edit goal" : "New goal"}</h1><form data-goal-form="${view === "edit" ? "update" : "create"}">${field("name", "What are you saving for?", g.name, 'required maxlength="80"')}<label class="gl-field">Type<select name="kind"><option value="purchase" ${g.kind === "purchase" ? "selected" : ""}>Purchase</option><option value="longterm" ${g.kind === "longterm" ? "selected" : ""}>Long-term fund</option></select></label>${amount("target", "Target amount (optional for long-term funds)", g.target_cents, false)}${amount("monthly", "Monthly contribution", g.monthly_cents)}<p class="gl-help">Set $0 to keep this on your wishlist. Contributions count toward your monthly goal limit.</p><div class="gl-columns">${field("priority", "Funding order (1 is first; 0 is last)", g.priority, 'min="0" max="99" required', "number")}${field("desired_date", "Desired date (optional)", g.desired_date || "", "", "date")}</div>${field("url", "Product link (optional)", g.url, 'maxlength="1000"', "url")}<label class="gl-field">Notes (optional)<textarea name="notes" maxlength="2000" rows="3">${esc(g.notes)}</textarea></label>${actions("Save goal")}</form>`;
  }
  function plan() {
    return `${back()}<h1>Monthly plan</h1><p class="gl-help">One limit for contributions across your goals. Allocations run on day ${data.settings.due_day} in ${esc(data.settings.timezone)} when automatic saving is enabled.</p><form data-goal-form="plan">${amount("monthly_limit", "Monthly goal limit", data.settings.monthly_limit_cents, false)}<h2 class="gl-section">Contributions</h2>${
      data.goals
        .filter((g) => g.status === "active")
        .map(
          (g) =>
            `<label class="gl-planrow"><span>${esc(g.name)}<small class="gl-muted">${g.kind === "purchase" ? "Purchase" : "Long-term"}</small></span><input name="amount-${g.id}" value="${inputMoney(g.monthly_cents)}" inputmode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" required aria-label="${esc(g.name)} monthly contribution"></label>`,
        )
        .join("") || empty("Create a goal to start planning contributions.")
    }<div class="gl-panel" aria-live="polite"><div class="gl-kv"><span>Monthly total</span><strong id="gl-plan-total">${money(data.monthly_total_cents)}</strong></div><div class="gl-kv"><span id="gl-plan-label">Left in plan</span><strong id="gl-plan-left">${money((data.settings.monthly_limit_cents ?? 0) - data.monthly_total_cents)}</strong></div></div>${actions("Save monthly plan")}</form>${btn(data.settings.automatic ? "Automatic saving is on · Settings" : "Set up automatic saving", "funding")}`;
  }
  function funding() {
    const s = data.settings,
      c = data.capacity;
    return `${back()}<h1>Funding setup</h1><p class="gl-help">Choose the cash behind your goals and protect the money you need before the next income arrives. This does not move money between accounts.</p>${c.source ? `<section class="gl-panel"><h2>${esc(c.source.name)}</h2><div class="gl-kv"><span>Cash balance</span><strong>${c.source.balance_cents == null ? "Unavailable" : money(c.source.balance_cents)}</strong></div><p class="gl-help">${esc(c.source.basis)} · ${c.source.observed_at ? new Date(c.source.observed_at).toLocaleString() : "Not observed"}</p><div class="gl-kv"><span>Goals reserved</span><strong>${money(c.reserved_cents)}</strong></div><div class="gl-kv"><span>Purchase payment holds</span><strong>${money(c.payment_holds_cents)}</strong></div><div class="gl-kv"><span>Available to earmark</span><strong>${c.available_cents == null ? "Needs review" : money(c.available_cents)}</strong></div>${c.reason ? `<p class="gl-notice">${esc(c.reason)}</p>` : ""}</section>` : ""}<form data-goal-form="configure"><label class="gl-field">Backing cash account<select name="source_id" required><option value="">Choose an account</option>${data.accounts.map((a) => `<option value="${esc(a.id)}" ${String(a.id) === s.source_id ? "selected" : ""}>${esc(a.name)}${a.kind === "manual" ? " · manually confirmed" : ""}</option>`).join("")}</select></label><p class="gl-help">Use one cash account for these goals. Investments and emergency savings are not automatically available. Exclude the purchase payment holds shown above from protected bills to avoid reserving them twice.</p><div class="gl-columns">${amount("bills", "Protect other bills & card payments", s.bills_cents)}${amount("buffer", "Keep a cash buffer", s.buffer_cents)}</div>${amount("monthly_limit", "Monthly goal limit", s.monthly_limit_cents, false)}<div class="gl-columns">${field("due_day", "Allocate on day of month", s.due_day, 'min="1" max="28" required', "number")}${field("timezone", "Time zone", s.source_id ? s.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone, 'required maxlength="80"')}</div><label class="gl-check"><input type="checkbox" name="automatic" ${s.automatic ? "checked" : ""}><span>Automatically reserve monthly contributions</span></label>${check("protection_confirmed", "I included upcoming bills, card payments, existing savings commitments, and a buffer. I will review these when my finances change.")}<p class="gl-help">Fresh cash is required (within 36 hours). Review protected money at least every 35 days. Contributions wait when funds are short. Missed months are not backfilled.</p>${actions("Save funding setup")}</form><div class="gl-section">${btn("Confirm a cash balance manually", "cash")}</div>`;
  }
  function cash() {
    const a = data.accounts.find((a) => a.id === "manual");
    return `${back("funding", "Funding setup")}<h1>Confirm cash balance</h1><p class="gl-help">Use the available balance from your bank, after pending debits. This is a separate manual source, not a bank sync.</p><form data-goal-form="cash">${field("name", "Account label", a?.name || "", 'required maxlength="80"')}${field("balance", "Available cash balance", a ? inputMoney(a.balance_cents) : "", 'inputmode="decimal" pattern="-?[0-9]+([.][0-9]{1,2})?" required')}${check("confirmed", "I checked this cash balance now. It excludes credit limits and investments.")}${actions("Confirm balance")}</form>`;
  }
  function movement() {
    const g = goal(),
      release = view === "release";
    return `${back("detail", g.name)}<h1>${release ? "Release or move" : "Set money aside"}</h1><form data-goal-form="${release ? "release" : "reserve"}">${amount("amount", "Amount", null)}${
      release
        ? `<label class="gl-field">Destination<select name="destination_id"><option value="">Unassigned cash</option>${data.goals
            .filter((x) => x.id !== id && x.status === "active")
            .map((x) => `<option value="${x.id}">${esc(x.name)}</option>`)
            .join("")}</select></label>`
        : ""
    }<section class="gl-panel"><div class="gl-kv"><span>${release ? "Set aside for this goal" : "Available to earmark"}</span><strong>${release ? money(g.saved_cents) : data.capacity.available_cents == null ? "Needs funding review" : money(data.capacity.available_cents)}</strong></div><p class="gl-help">${release ? "Money stays in the same bank account." : "Bills, your buffer, and existing reservations are excluded."}</p></section>${actions(release ? "Confirm change" : "Set aside")}</form>`;
  }
  function paymentList() {
    return `${back()}<h1>Purchase payments</h1><p class="gl-help">Cash stays reserved until you confirm the payment is reflected in your backing account. Credit-card purchases keep their hold until the card is paid.</p>${data.purchases.map((p) => `<section class="gl-panel"><div class="gl-row"><h2>${esc(data.goals.find((g) => g.id === p.goal_id)?.name || "Goal")}</h2><strong>${money(p.amount_cents)}</strong></div><p class="gl-help">${p.method === "card" ? "Credit card" : "Cash / debit"} · ${new Date(p.created_at).toLocaleDateString()} · ${p.held_cents ? money(p.held_cents) + " held" : "Settled"}</p><p class="gl-help">${p.transaction ? esc(p.transaction.description) + " · " + p.transaction.date : "Transaction not linked yet"}</p>${p.attention ? `<p class="gl-notice">${esc(p.attention)}</p>` : ""}<div class="gl-actions">${p.held_cents ? btn("Confirm payment settled", "settle", `data-purchase="${p.id}"`) : ""}${btn(p.transaction_id ? "Change transaction link" : "Link transaction", "link", `data-purchase="${p.id}"`)}</div></section>`).join("") || empty("Recorded purchases will appear here.")}`;
  }
  function purchaseForm() {
    const linking = view === "link",
      g = goal(),
      p = selectedPurchase();
    return `${back(linking ? "payments" : "detail", linking ? "Purchase payments" : g.name)}<h1>${linking ? "Link transaction" : "Record purchase"}</h1><form data-goal-form="${linking ? "link" : "purchase"}">${linking ? `<p class="gl-help">Choose a matching posted transaction for ${money(p.amount_cents)}.</p>` : `${amount("amount", "Actual purchase amount", g.saved_cents)}<label class="gl-field">Payment method<select name="method"><option value="cash">Cash / debit</option><option value="card">Credit card</option></select></label>`}<label class="gl-field">Find a transaction<input name="search" type="search" placeholder="Merchant or description" maxlength="100"></label>${btn("Search transactions", "search-transactions")}<label class="gl-field">${linking ? "Matching transaction" : "Transaction (optional until imported)"}<select name="transaction_id" ${linking ? "required" : ""}><option value="">${linking ? "Choose transaction" : "Link later"}</option>${receiptOptions.map((t) => `<option value="${esc(t.id)}">${esc(t.date)} · ${esc(t.description)} · ${money(t.amount_cents)}</option>`).join("")}</select></label>${linking ? "" : check("confirmed", g.kind === "purchase" ? "Record this purchase, keep its cash reserved for payment, and release any unused goal money." : "Record this partial purchase and keep its cash reserved for payment.")}<p class="gl-help">This records how the goal was used. Spending is counted through your existing transactions, so nothing is counted twice.</p>${actions(linking ? "Link transaction" : "Record purchase")}</form>`;
  }
  function confirmation() {
    const settle = view === "settle",
      g = goal(),
      p = selectedPurchase();
    return `${back(settle ? "payments" : "detail")}<h1>${settle ? "Settle payment hold" : view === "complete" ? "Complete fund" : "Archive goal"}</h1><p class="gl-help">${settle ? `${money(p.held_cents)} will become unreserved. Check the backing cash balance before proceeding.` : "Unused reservations will return to unassigned cash. Monthly contributions will stop; history stays available."}</p><form data-goal-form="${view}">${check("confirmed", settle ? "This payment has cleared and is reflected in the current backing cash balance. For a card purchase, the card has been paid." : "Release unused reservations and stop this goal’s contributions.")}${actions(settle ? "Release payment hold" : "Confirm")}</form>`;
  }
  function render() {
    if (disposed) return;
    if (!data) {
      element.innerHTML = `<p role="${error ? "alert" : "status"}" class="gl-empty">${esc(error || "Loading goals…")}</p>${error ? btn("Retry", "refresh") : ""}`;
      return;
    }
    const content =
      view === "list"
        ? list()
        : view === "detail"
          ? detail()
          : ["edit", "new"].includes(view)
            ? edit()
            : view === "plan"
              ? plan()
              : view === "funding"
                ? funding()
                : view === "cash"
                  ? cash()
                  : ["reserve", "release"].includes(view)
                    ? movement()
                    : view === "payments"
                      ? paymentList()
                      : ["purchase", "link"].includes(view)
                        ? purchaseForm()
                        : ["settle", "archive", "complete"].includes(view)
                          ? confirmation()
                          : `${back()}<h1>Completed & archived</h1>${
                              data.goals
                                .filter((g) => g.status !== "active")
                                .map(
                                  (g) =>
                                    `<button class="gl-wish" type="button" data-gl="goal" data-id="${g.id}">${title(g)}<small>${g.status}</small>${icon("chevron")}</button>`,
                                )
                                .join("") ||
                              empty(
                                "Completed and archived goals will appear here.",
                              )
                            }`;
    element.innerHTML = `${error ? `<div class="gl-notice" role="alert">${esc(error)} ${btn("Refresh goals", "refresh")}</div>` : ""}${message ? `<p role="status" class="gl-success">${esc(message)}</p>` : ""}${content}<p class="gl-disclosure">${icon("shield")}Money stays in your accounts. Reservations do not change cash flow or net worth.</p>`;
  }
  async function load() {
    try {
      const fresh = await request("/goals");
      if (disposed) return;
      data = fresh;
      error = "";
      render();
    } catch (e) {
      if (disposed) return;
      error = e.message;
      if (e.status === 401 || e.status === 403) data = null;
      render();
    }
  }
  function navigate(next) {
    view = next;
    message = "";
    error = "";
    retry = null;
    receiptOptions = [];
    render();
    element.scrollIntoView({ block: "start", behavior: "instant" });
  }
  const click = async (e) => {
    const b = e.target.closest("[data-gl]");
    if (!b || busy) return;
    const action = b.dataset.gl;
    if (action === "refresh") {
      retry = null;
      await load();
      return;
    }
    if (action === "goal") {
      id = b.dataset.id;
      navigate("detail");
      return;
    }
    if (action === "tab") {
      tab = b.dataset.tab;
      view = "list";
      render();
      return;
    }
    if (action === "restore") {
      await save({ action: "restore", id });
      return;
    }
    if (action === "search-transactions") {
      const form = b.closest("form");
      b.disabled = true;
      try {
        receiptOptions = await request(
          "/goals/transactions?q=" +
            encodeURIComponent(form.elements.search.value),
        );
        if (disposed) return;
        form.elements.transaction_id.innerHTML =
          '<option value="">Choose transaction</option>' +
          receiptOptions
            .map(
              (t) =>
                `<option value="${esc(t.id)}">${esc(t.date)} · ${esc(t.description)} · ${money(t.amount_cents)}</option>`,
            )
            .join("");
      } catch (err) {
        form.querySelector("#gl-form-error").textContent = err.message;
      } finally {
        b.disabled = false;
      }
      return;
    }
    if (b.dataset.purchase) purchaseId = b.dataset.purchase;
    navigate(action);
  };
  async function save(payload, form = null) {
    const signature = JSON.stringify(payload);
    if (!retry || retry.signature !== signature)
      retry = {
        signature,
        body: {
          ...payload,
          revision: data.settings.revision,
          request_id: crypto.randomUUID(),
        },
      };
    busy = true;
    if (form)
      for (const b of form.querySelectorAll("button")) b.disabled = true;
    try {
      const result = await request("/goals/actions", "POST", retry.body);
      const fresh = await request("/goals");
      if (disposed) return;
      retry = null;
      data = fresh;
      id =
        result.id && ["create", "update"].includes(payload.action)
          ? result.id
          : id;
      view = ["purchase", "settle", "link"].includes(payload.action)
        ? "payments"
        : payload.action === "cash"
          ? "funding"
          : [
                "create",
                "update",
                "reserve",
                "release",
                "move",
                "restore",
              ].includes(payload.action)
            ? "detail"
            : "list";
      message = "Saved.";
      error = "";
      render();
    } catch (e) {
      if (disposed) return;
      if (e.status === 401 || e.status === 403) {
        data = null;
        error = "Your session ended. Sign in again.";
        render();
      } else if (form) {
        form.querySelector("#gl-form-error").textContent = e.message;
      } else {
        error = e.message;
        render();
      }
    } finally {
      busy = false;
      if (form?.isConnected)
        for (const b of form.querySelectorAll("button")) b.disabled = false;
    }
  }
  const submit = (e) => {
    const form = e.target.closest("[data-goal-form]");
    if (!form) return;
    e.preventDefault();
    e.stopPropagation();
    if (busy || !form.reportValidity()) return;
    const v = Object.fromEntries(new FormData(form));
    const action = form.dataset.goalForm;
    let payload = { ...v, action, id };
    delete payload.search;
    for (const name of ["confirmed", "protection_confirmed", "automatic"])
      payload[name] = form.elements[name]?.checked === true;
    if (action === "plan")
      payload = {
        action,
        monthly_limit: v.monthly_limit,
        contributions: data.goals
          .filter((g) => g.status === "active")
          .map((g) => ({ id: g.id, amount: v["amount-" + g.id] })),
      };
    if (action === "release" && v.destination_id) payload.action = "move";
    if (action === "settle" || action === "link")
      payload.purchase_id = purchaseId;
    save(payload, form);
  };
  const input = (e) => {
    const form = e.target.closest('[data-goal-form="plan"]');
    if (!form) return;
    const total = [...form.querySelectorAll('input[name^="amount-"]')].reduce(
        (n, i) => n + Math.round((Number(i.value) || 0) * 100),
        0,
      ),
      limit = Math.round(
        (Number(form.elements.monthly_limit.value) || 0) * 100,
      ),
      difference = limit - total;
    form.querySelector("#gl-plan-total").textContent = money(total);
    form.querySelector("#gl-plan-label").textContent =
      difference < 0 ? "Over monthly limit" : "Left in plan";
    form.querySelector("#gl-plan-left").textContent = money(
      Math.abs(difference),
    );
    form
      .querySelector("#gl-plan-left")
      .classList.toggle("gl-warning", difference < 0);
  };
  element.addEventListener("click", click);
  element.addEventListener("submit", submit);
  element.addEventListener("input", input);
  load();
  const timer = setInterval(() => {
    if (view === "list" && !busy) load();
  }, 60000);
  return () => {
    disposed = true;
    clearInterval(timer);
    element.removeEventListener("click", click);
    element.removeEventListener("submit", submit);
    element.removeEventListener("input", input);
    element.replaceChildren();
  };
}
