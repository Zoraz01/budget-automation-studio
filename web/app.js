import { reviewPane, reviewForm, reviewSnapshot } from "./review.js";
import { cashPlanCard, previewCashPlan } from "./cash-plan.js";
import { latestRequest } from "./latest-request.js";
const stateRequests = latestRequest();
let stateError = null;
import { mountGoals } from "./goals.js";
let disposeGoals = null;
const app = document.querySelector("#app"),
  dialog = document.querySelector("#editor");
const icons = {
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  transactions: "M4 7h16 M4 12h16 M4 17h10",
  budgets: "M4 4h16v16H4z M8 8h8 M8 12h3 M8 16h6",
  connections: "M8 12h8 M9 6H6a4 4 0 0 0 0 8h3 M15 10h3a4 4 0 0 1 0 8h-3",
  chat: "M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 18 0z M7 10h8 M7 14h5",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  up: "M6 16L18 4 M8 4h10v10",
  down: "M6 8l12 12 M8 20h10V10",
  shield: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6",
  close: "M6 6l12 12 M6 18L18 6",
  wallet: "M3 6h16v4 M3 6v14h18V10H3 M16 14h5",
  spark: "M12 3l3 6 6 3-6 3-3 6-3-6-6-3 6-3z",
};
const icon = (name) =>
  `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="${icons[name] || icons.wallet}"/></svg>`;
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const localMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};
let reviewAnnouncement = "";
let reviewSelectedId = null,
  reviewBusy = false,
  reviewError = null,
  reviewRefreshRequired = false,
  reviewEditSnapshot = null,
  reviewEpoch = 0;
let activityReviewOnly = false,
  activitySearch = "";
let selectedMonth = localMonth(),
  page = "overview",
  state = null,
  messages = [],
  conversations = [],
  activeConversation = null,
  conversationBefore = null,
  conversationNext = null,
  historyArchived = false,
  historyOpen = false,
  chatDrafts = {},
  historyTimer,
  noticeTimer,
  chatBusy = false,
  chatEpoch = 0;
const money = (value) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: state?.currency || "USD",
    maximumFractionDigits: 2,
  }).format(value / 100);
const monthTitle = () =>
  new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
    new Date(`${selectedMonth}-02T12:00:00`),
  );
function notice(value) {
  document.querySelector("#notice").textContent = value;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    document.querySelector("#notice").textContent = "";
  }, 6500);
}
async function api(path, method = "GET", data, { signal } = {}) {
  const response = await fetch(path, {
    method,
    signal,
    headers: method === "GET" ? {} : { "Content-Type": "application/json" },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  const result = await response.json();
  signal?.throwIfAborted();
  if (!response.ok) {
    if (response.status === 401 && path != "/api/login") {
      state = null;
      resetReview();
      clearChat();
      activitySearch = "";
      activityReviewOnly = false;
      await loginScreen();
    }
    const error = new Error(result.error || "Something went wrong");
    error.status = response.status;
    throw error;
  }
  return result;
}
async function load() {
  const request = stateRequests.begin();
  const month = selectedMonth;
  stateError = null;
  if (state) render();
  try {
    const next = await api(
      `/api/state?month=${encodeURIComponent(month)}`,
      "GET",
      undefined,
      { signal: request.signal },
    );
    if (!request.current()) return;
    state = next;
    if (reviewRefreshRequired) {
      reviewRefreshRequired = false;
      reviewError = null;
    }
    render();
  } catch (error) {
    if (!request.current()) return;
    stateError = error.message;
    if (state) render();
    else throw error;
  }
}
function stateStatus() {
  if (stateError)
    return `<section class="card" role="alert"><p>Budget data could not be loaded. ${escape(stateError)}</p><button data-action="refresh">Retry</button></section>`;
  return `<section class="card" role="status">Loading ${escape(monthTitle())}…</section>`;
}

function clearReviewFeedback() {
  clearTimeout(noticeTimer);
  document.querySelector("#notice").textContent = "";
  reviewAnnouncement = "";
}
function reviewNotice(message) {
  if (page === "transactions" && activityReviewOnly) {
    clearReviewFeedback();
    reviewAnnouncement = message;
    if (state) render();
  } else notice(message);
}
function resetReview() {
  clearReviewFeedback();
  reviewEpoch++;
  reviewBusy = false;
  reviewSelectedId = null;
  reviewError = null;
  reviewRefreshRequired = false;
  if (reviewEditSnapshot || dialog.querySelector("#review-edit-form")) {
    dialog.close();
    dialog.innerHTML = "";
  }
  reviewEditSnapshot = null;
}
function focusedReview() {
  return reviewPane(activityRows(), state.categories, {
    selectedId: reviewSelectedId,
    disabled: reviewBusy,
    error: reviewError,
    refreshRequired: reviewRefreshRequired,
    filtered: !!activitySearch.trim(),
    searchValue: activitySearch,
    escape,
    money,
  });
}
async function refreshReview() {
  if (reviewBusy) return;
  try {
    await load();
    if (state && !stateError && state.summary.month === selectedMonth) {
      reviewError = null;
      reviewRefreshRequired = false;
      render();
    }
  } catch (error) {
    notice(error.message);
  }
}
async function approveReview(id) {
  if (reviewBusy || reviewRefreshRequired || !state || stateError) return;
  const transaction = state.transactions.find((row) => row.id === id);
  if (!transaction || transaction.pending || transaction.reviewed) return;
  const epoch = reviewEpoch;
  reviewBusy = true;
  reviewError = null;
  render();
  try {
    await api("/api/transactions/review", "PATCH", {
      id,
      approve: true,
      expected: reviewSnapshot(transaction),
    });
    if (epoch !== reviewEpoch || !state) return;
    reviewSelectedId = null;
    await load();
    reviewNotice("Purchase approved.");
  } catch (error) {
    if (epoch !== reviewEpoch || !state) return;
    reviewError = error.message;
    reviewRefreshRequired = true;
    if (page === "transactions" && activityReviewOnly) reviewNotice("");
    else notice(error.message);
  } finally {
    if (epoch === reviewEpoch) {
      reviewBusy = false;
      if (state) render();
      if (page === "transactions" && activityReviewOnly)
        (
          document.querySelector(".review-approve") ||
          document.querySelector("#main")
        )?.focus({ preventScroll: true });
    }
  }
}
function editReview(id) {
  if (reviewBusy || reviewRefreshRequired || !state || stateError) return;
  const transaction = state.transactions.find((row) => row.id === id);
  if (!transaction || transaction.pending || transaction.reviewed) return;
  reviewEditSnapshot = { id, expected: reviewSnapshot(transaction) };
  openDialog(
    "Edit purchase",
    reviewForm(transaction, state.categories, {
      currency: state.currency,
      escape,
    }),
  );
}
async function saveReview(form, approve) {
  if (reviewBusy || !reviewEditSnapshot || !state) return;
  if (reviewRefreshRequired) {
    document.querySelector("#dialog-error").textContent =
      "Close the editor and refresh the purchase status before trying again. Your draft is still here.";
    return;
  }
  const epoch = reviewEpoch;
  const values = Object.fromEntries(new FormData(form));
  const snapshot = reviewEditSnapshot;
  reviewBusy = true;
  form.querySelector("fieldset").disabled = true;
  dialog.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
  });
  document.querySelector("#dialog-error").textContent = "";
  try {
    await api("/api/transactions/review", "PATCH", {
      ...snapshot,
      approve,
      edits: values,
    });
    if (epoch !== reviewEpoch || !state) return;
    reviewEditSnapshot = null;
    dialog.close();
    await load();
    reviewNotice(
      approve
        ? "Purchase approved."
        : "Changes saved. Approval is still required.",
    );
  } catch (error) {
    if (epoch !== reviewEpoch || !state) return;
    if (approve) {
      reviewError = error.message;
      reviewRefreshRequired = true;
    }
    document.querySelector("#dialog-error").textContent = error.message;
  } finally {
    if (epoch === reviewEpoch) {
      reviewBusy = false;
      form.querySelector("fieldset").disabled = false;
      dialog.querySelectorAll("button").forEach((button) => {
        button.disabled = false;
      });
      if (state) render();
      if (!dialog.open && page === "transactions" && activityReviewOnly)
        document
          .querySelector(".review-approve")
          ?.focus({ preventScroll: true });
    }
  }
}
dialog.addEventListener("cancel", (event) => {
  if (reviewBusy && reviewEditSnapshot) event.preventDefault();
});
dialog.addEventListener("close", () => {
  if (!reviewBusy) reviewEditSnapshot = null;
});

function brand() {
  return '<div class="brand"><img src="/logo.svg" alt=""/><span>BAS<small>Budget Automation Studio</small></span></div>';
}
function installGuide() {
  return `<details class="install-guide card"><summary>Add to your phone’s Home Screen</summary><p>Open your own secure, phone-accessible app address first. The computer-only demo address cannot open this workspace on a phone.</p><h3>iPhone · Safari</h3><ol><li>Open the app in Safari and tap Share.</li><li>Choose Add to Home Screen.</li><li>Keep Open as Web App on, name it BAS, then tap Add.</li></ol><h3>Android · Chrome</h3><ol><li>Open the app in Chrome and tap the three-dot menu.</li><li>Choose Install and create shortcut → Install, or Add to Home screen → Install.</li><li>Confirm, then open BAS from your Home Screen.</li></ol><p>You may need to sign in again. The app needs a connection to its server; adding an icon does not make it work offline.</p></details>`;
}
async function loginScreen() {
  stateRequests.cancel();
  disposeGoals?.();
  disposeGoals = null;
  const session = await api("/api/session");
  app.innerHTML = `<main id="main" class="login login-studio"><section class="login-story">${brand()}<div class="login-story-copy"><p class="eyebrow">YOUR MONEY, IN YOUR ELEMENT</p><h1>Find your<br>financial flow.</h1><p>Your budget. Your connections. Your code.<br>A little more clarity, on your terms.</p><div class="login-pillars"><span>01 / Plan</span><span>02 / Review</span><span>03 / Connect</span></div></div><img class="login-watermark" src="/logo.svg" alt="" width="280" height="280"></section><section class="login-panel" aria-labelledby="login-title"><span class="badge">${session.mode === "demo" ? "Synthetic demo" : "Personal workspace"}</span><h2 id="login-title">${session.mode === "demo" ? "A studio to explore." : "Welcome to your studio."}</h2><p>${session.mode === "demo" ? "Try budgets, review transactions, and explore the assistant with invented data. Make yourself at home." : "Open your local workspace to review the month and keep your plan moving."}</p><form id="login-form"><label for="password">${session.mode === "demo" ? "Demo password" : "Your local password"}<input id="password" name="password" type="password" autocomplete="current-password" required ${session.mode === "demo" ? 'value="demo"' : ""}></label><button class="primary" type="submit">${session.mode === "demo" ? "Explore the demo" : "Open your budget"} →</button><p id="login-error" role="alert" class="dialog-error"></p></form><p class="note">${session.mode === "demo" ? "Invented data only. Demo password: demo. No bank connection or API key needed. Changes stay in this local demo." : "Use the password generated by npm run setup. This instance stores data on your computer."}</p>${installGuide()}<a class="login-source" href="https://github.com/Zoraz01/budget-automation-studio" target="_blank" rel="noopener noreferrer">Open source. Built to make your own. ↗</a></section></main>`;
}
const nav = [
  ["overview", "Home"],
  ["transactions", "Activity"],
  ["budgets", "Budgets"],
  ["goals", "Goals"],
  ["connections", "Connect"],
  ["chat", "Ask BAS"],
];
function render() {
  disposeGoals?.();
  disposeGoals = null;
  const focused = document.activeElement;
  const restoreComposer = focused?.matches("#chat-form textarea");
  const selection = restoreComposer
    ? [focused.selectionStart, focused.selectionEnd]
    : null;

  if (!state) return;
  const ready = !stateError && state.summary.month === selectedMonth;
  const reviewCountLabel = `${state.summary.unreviewed_count} purchase${state.summary.unreviewed_count === 1 ? "" : "s"} left`;
  const reviewDescription = ready
    ? reviewCountLabel
    : stateError
      ? "Review unavailable"
      : "Loading purchases…";
  app.innerHTML = `<div class="shell"><aside class="sidebar">${brand()}<nav class="nav" aria-label="Main navigation">${nav.map(([id, label]) => `<button data-page="${id}" class="${id === page ? "active" : ""}" ${id === page ? 'aria-current="page"' : ""}>${icon(id === "goals" ? "wallet" : id)}<span>${label}</span></button>`).join("")}</nav><div class="sidebar-foot">${icon("shield")}<strong>Your budget. Your control.</strong><p>Local storage, open source, and connections you choose.</p></div></aside><div class="workspace"><header class="topbar"><span class="breadcrumbs">Your workspace / ${nav.find((n) => n[0] === page)[1]}</span><div class="top-actions"><span class="badge">${state.mode === "demo" ? "Synthetic demo" : "Personal workspace"}</span><button class="ghost small" data-action="logout">Sign out</button><span class="avatar" aria-hidden="true">BAS</span></div></header><main id="main" tabindex="-1"><div class="page-head">${page === "goals" ? "<span></span>" : page === "overview" ? '<h1 class="home-page-title">Home</h1>' : `<div><div class="page-eyebrow">${"YOUR STUDIO / " + escape(nav.find((n) => n[0] === page)[1].toUpperCase())}</div><h1>${{ transactions: activityReviewOnly ? "Review" : "Every transaction, in view.", budgets: "A plan that fits your life.", connections: "Bring it all together.", chat: "A little help with the numbers." }[page]}</h1><p>${{ transactions: activityReviewOnly ? reviewDescription : "Review, categorize, and keep the details organized.", budgets: "Set your priorities. Adjust as life happens.", connections: "Connect the services you choose, with your own keys.", chat: "Ask about the month you’re looking at." }[page]}</p></div>`}<label class="month-label" for="month" ${page === "goals" ? "hidden" : ""}>YOUR BUDGET MONTH<input type="month" id="month" value="${selectedMonth}" required></label></div>${!ready ? stateStatus() : { overview: overview, transactions: transactions, budgets: budgets, connections: connections, chat: chat, goals: () => '<div id="goals-content"></div>' }[page]()}<p class="footer-note" ${ready ? "" : "hidden"}>${state.mode === "demo" ? "All figures are invented demo data. " : ""}One currency per workspace · ${escape(state.currency)} · Posted transactions only in totals · ${state.summary.unreviewed_count} awaiting review</p></main></div></div>`;
  if (page === "goals")
    document.querySelector("#main").classList.add("goals-main");
  if (page === "goals" && ready)
    disposeGoals = mountGoals(
      document.querySelector("#goals-content"),
      (path, method = "GET", body) => api("/api" + path, method, body),
    );
  if (page === "transactions" && activityReviewOnly) {
    const status = document.querySelector(".page-head p");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    if (reviewAnnouncement && ready)
      status.textContent = `${reviewCountLabel} · ${reviewAnnouncement}`;
  }
  if (restoreComposer) {
    const composer = document.querySelector("#chat-form textarea");
    if (composer && !composer.disabled) {
      composer.focus({ preventScroll: true });
      composer.setSelectionRange(...selection);
    }
  }
}
function budgetRows() {
  const categories = state.summary.categories.filter((c) => c.limit_cents > 0);
  return categories.length
    ? categories
        .map(
          (c) =>
            `<div class="budget-row ${c.spent_cents > c.limit_cents ? "over" : ""}"><div class="budget-meta"><strong>${escape(c.name)}</strong><span>${money(c.spent_cents)} / ${money(c.limit_cents)}</span></div><progress aria-label="${escape(c.name)} budget used" max="${c.limit_cents}" value="${Math.max(0, c.spent_cents)}"></progress><small>${c.remaining_cents >= 0 ? `${money(c.remaining_cents)} left` : `${money(-c.remaining_cents)} over budget`}</small></div>`,
        )
        .join("")
    : '<p class="empty">Give your money a plan.<br>Add your first monthly budget.</p>';
}
function txnList(rows, editable = false) {
  return rows.length
    ? rows
        .map(
          (t) =>
            `<div class="txn"><span class="txn-icon">${icon(t.amount_cents < 0 ? "down" : "wallet")}</span><div><strong>${escape(t.description)}</strong><small>${escape(t.date)} · ${escape(state.categories.find((c) => c.id === t.category_id)?.name || "Uncategorized")}${!t.reviewed ? " · Needs review" : ""}</small>${editable && !t.pending ? `<label class="sr-only" for="cat-${escape(t.id)}">Category for ${escape(t.description)}</label><select id="cat-${escape(t.id)}" data-transaction="${escape(t.id)}">${categoryOptions(t.category_id)}</select>${!t.reviewed ? `<button class="small ghost" data-review="${escape(t.id)}" data-category="${escape(t.category_id)}">Approve</button>` : ""}` : ""}</div><div class="amount ${t.amount_cents < 0 ? "income" : ""}">${t.amount_cents < 0 ? "+" : "−"}${money(Math.abs(t.amount_cents))}${t.pending ? '<small class="pending">Pending · excluded</small>' : ""}</div></div>`,
        )
        .join("")
    : '<p class="empty">No transactions this month.<br>Add one manually or connect a provider.</p>';
}
function overview() {
  const s = state.summary;
  const review = state.transactions.filter((t) => !t.pending && !t.reviewed);
  const g = state.goalSummary;
  const remaining = s.budget_cents - s.spent_cents;
  const investments = state.investments.slice(0, 3);
  const investmentAmount = (account) => {
    if (account.value_cents == null || !account.currency) return "Unavailable";
    if (account.currency !== state.currency)
      return `${escape(account.currency)} ${escape((account.value_cents / 100).toFixed(2))}`;
    return money(account.value_cents);
  };
  return `<div class="daily-home">
    <div class="home-metrics">
      <section class="card home-metric home-flow" aria-label="Net cash flow"><h2 class="home-metric-label">Net cash flow</h2><div class="home-metric-value big ${s.net_cents < 0 ? "negative" : ""}">${money(s.net_cents)}</div><p class="home-caption">${escape(monthTitle())} · income minus spending</p><a class="home-link" href="#home-flow-details">How it's calculated ↓</a></section>
      <section class="card home-metric" aria-label="Period spending"><h2 class="home-metric-label">Spending</h2><div class="home-metric-value">${money(s.spent_cents)}</div><p class="home-caption">Posted activity · ${escape(monthTitle())}</p><button class="ghost small home-link" data-page="transactions">View spending →</button></section>
      <section class="card home-metric" aria-label="Period income"><h2 class="home-metric-label">Money in</h2><div class="home-metric-value">${money(s.income_cents)}</div><p class="home-caption">Recorded income for this period</p><p class="home-caption">${s.pending_count} pending · excluded from totals</p></section>
    </div>
    <div class="home-overview-grid">
      <section class="card home-review"><div class="card-head"><h2>${s.unreviewed_count ? `${s.unreviewed_count} transaction${s.unreviewed_count === 1 ? "" : "s"} to review` : "You're up to date"}</h2><button class="${s.unreviewed_count ? "primary" : "ghost"} small" data-page="transactions" data-review-only="${s.unreviewed_count > 0}">${s.unreviewed_count ? "Start review" : "Open activity"}</button></div>${review.length ? txnList(review.slice(0, 4)) : '<p class="home-note">New posted purchases will appear here for you to check.</p>'}<p class="home-note">Review category suggestions before confirming them.</p></section>
      <section class="card home-budget"><div class="card-head"><h2>${escape(monthTitle())} budget</h2><button class="ghost small home-link" data-page="budgets">View budget →</button></div>${s.budget_cents > 0 ? `<div class="home-budget-value ${remaining < 0 ? "negative" : ""}">${money(Math.abs(remaining))}</div><p class="home-caption">${remaining < 0 ? "Over" : "Remaining in"} the full-month budget</p><progress class="home-progress" aria-label="Monthly budget used" max="${s.budget_cents}" value="${Math.max(0, Math.min(s.spent_cents, s.budget_cents))}"></progress><div class="home-row"><span>Spent this month</span><strong>${money(s.spent_cents)}</strong></div><div class="home-row"><span>Full-month target</span><strong>${money(s.budget_cents)}</strong></div><p class="home-note">Budget remaining is a target comparison, not available cash. Spending without an allocated budget still counts.</p>` : '<p class="home-note">Set monthly targets to compare your spending with a plan.</p><button data-page="budgets">Set a budget</button>'}</section>
      ${cashPlanCard()}
      <div class="home-context-stack">
        <section class="card"><div class="card-head"><h2>Goals</h2><button class="ghost small home-link" data-page="goals">View goals →</button></div>${g ? `<div class="home-context-value">${money(g.reserved_cents)} <small>reserved</small></div><p class="home-caption">${money(g.monthly_total_cents)}/month planned</p>${g.payment_holds_cents > 0 ? `<p class="home-note">${money(g.payment_holds_cents)} held for purchase payments.</p>` : ""}<p class="home-note">Reservations set aside existing cash. They don't move money between accounts.</p>` : '<p class="home-note">Open Goals to inspect reservations and monthly contributions.</p>'}</section>
        <section class="card"><div class="card-head"><h2>Investments</h2><button class="ghost small home-link" data-page="connections">View accounts →</button></div>${investments.length ? investments.map((a) => `<div class="home-row"><div>${escape(a.name)}<small>${escape(a.status)} · ${escape(a.synced_at ? new Date(a.synced_at).toLocaleDateString() : "Not yet observed")}</small></div><strong>${investmentAmount(a)}</strong></div>`).join("") : '<p class="home-note">Investment account values appear after a successful import.</p>'}<p class="home-note">Account values stay separate from monthly cash flow. Missing values remain unavailable; last-known values can be stale.</p></section>
      </div>
    </div>
    <h2 class="home-section-title">The month in detail</h2>
    <div class="home-overview-grid">
      <section class="card activity-card"><div class="card-head"><h2>Recent activity</h2><button class="small ghost home-link" data-page="transactions">View all →</button></div>${txnList(state.transactions.slice(0, 5))}</section>
      <section class="card"><div class="card-head"><h2>Budget by category</h2><button class="small ghost home-link" data-page="budgets">Edit →</button></div>${budgetRows()}</section>
      <section class="card" id="home-flow-details"><div class="card-head"><h2>Cash-flow breakdown</h2><span class="home-caption">${escape(monthTitle())}</span></div><div class="home-row"><span>Money in</span><strong>${money(s.income_cents)}</strong></div><div class="home-row"><span>Spending, after refunds</span><strong>${money(s.spent_cents)}</strong></div><p class="home-note">Net cash flow is income minus spending for the selected month. It is not an account balance. Transfers are excluded; pending transactions stay outside these totals.</p></section>
      <section class="card"><div class="card-head"><h2>Assistant</h2><button class="small ghost home-link" data-page="chat">Ask BAS →</button></div><p class="home-note">Continue a saved conversation or ask about this month's numbers.</p></section>
    </div>
  </div>`;
}
function categoryOptions(selected = "uncategorized") {
  return state.categories
    .map(
      (c) =>
        `<option value="${escape(c.id)}" ${selected === c.id ? "selected" : ""}>${escape(c.name)}</option>`,
    )
    .join("");
}
function activityRows() {
  return state.transactions.filter(
    (t) =>
      (!activityReviewOnly || (!t.reviewed && !t.pending)) &&
      `${t.description} ${state.categories.find((c) => c.id === t.category_id)?.name}`
        .toLowerCase()
        .includes(activitySearch.toLowerCase()),
  );
}
function transactions() {
  const controls = `<div class="filter-row"><div class="activity-modes" aria-label="Activity view"><button class="small ${!activityReviewOnly ? "active" : "ghost"}" data-activity-mode="all" aria-pressed="${!activityReviewOnly}">All activity</button><button class="small ${activityReviewOnly ? "active" : "ghost"}" data-activity-mode="review" aria-pressed="${activityReviewOnly}">Needs review · ${state.summary.unreviewed_count}</button></div>${activityReviewOnly ? "" : `<label class="search"><span class="sr-only">Search transactions</span><input id="search" value="${escape(activitySearch)}" placeholder="Search description or category…" type="search"></label>`}${activityReviewOnly ? "" : '<button class="primary" data-action="add-transaction">+ Add transaction</button>'}</div>`;
  return `<section class="${activityReviewOnly ? "review-workspace" : "card wide"}">${controls}<div id="transaction-list">${activityReviewOnly ? focusedReview() : activityRows().length ? txnList(activityRows(), true) : '<p class="empty">No transactions match this view.</p>'}</div></section>`;
}

function budgets() {
  return `<div class="dashboard-grid"><section class="card"><div class="card-head"><h2>${escape(monthTitle())}</h2><button class="small" data-action="add-category">+ Category</button></div>${state.summary.categories.map((c) => `<form class="budget-editor" data-budget="${escape(c.id)}"><label>${escape(c.name)}<input name="amount" inputmode="decimal" type="text" value="${(c.limit_cents / 100).toFixed(2)}" pattern="[0-9]+([.][0-9]{1,2})?" required aria-label="${escape(c.name)} monthly budget in ${escape(state.currency)}"></label><button type="submit">Save</button></form>`).join("")}</section><div class="stack"><section class="card"><h2>Plan, then adjust.</h2><p class="muted">These limits belong to ${escape(monthTitle())}. Change the month to set a different plan.</p><p class="note">Amounts are in ${escape(state.currency)}. Zero means no budget has been allocated. Unused budgets do not roll over automatically.</p></section><section class="card"><h2>Budget progress</h2>${budgetRows()}</section></div></div>`;
}
function connections() {
  return `${installGuide()}<div class="provider-grid section-gap"><section class="card"><div class="provider-mark">Plaid</div><h2>Everyday banking</h2><p>Import bank and card transactions. Review categories after syncing.</p><p class="note">${state.providers.plaid ? `Configured · ${escape(state.providers.plaidEnvironment)}` : "Add your own keys in personal mode. Sandbox is the default."}</p><button data-action="plaid-connect" ${!state.providers.plaid ? "disabled" : ""}>Connect a bank</button></section><section class="card"><div class="provider-mark">SnapTrade</div><h2>Your investments</h2><p>Read investment account values through the connection portal.</p><p class="note">${state.providers.snaptrade ? "Configured · read-only portal" : "Personal or Commercial keys supported. No trading routes."}</p><button data-action="snaptrade-connect" ${!state.providers.snaptrade ? "disabled" : ""}>Connect investments</button></section><section class="card"><div class="provider-mark">${escape(state.providers.assistant.label)}</div><h2>Your AI assistant</h2><p>Connect OpenAI, Anthropic or Google Gemini with your API key, or use local Ollama.</p><p class="note">${state.providers.ai ? `Configured · ${escape(state.providers.assistant.model)}. ${state.providers.assistant.cloud ? "Questions and budget aggregates go to this cloud provider." : "Questions and budget aggregates go to local Ollama."}` : state.providers.assistant.provider === "disabled" ? "Optional · budget summaries work without AI." : "Setup incomplete · add your API key or model and restart BAS."}</p><details><summary>Set up AI</summary><p>On your server, run <code>npm run setup:ai</code>, choose a provider and enter its API key. A default model is selected for you. Restart BAS, then open Assistant.</p><p class="note">Keys stay on your server. Cloud providers require their own API access and billing. Demo mode always keeps AI off.</p></details><button data-page="chat">Open assistant →</button></section></div><section class="card section-gap"><div class="card-head"><h2>Connection status</h2><button class="small" data-action="refresh">Refresh view</button></div>${state.connections.length ? state.connections.map((c) => `<div class="connection-row"><div><strong>${escape(c.provider === "plaid" ? "Bank connection" : "Investment connection")}</strong><small>Status: ${escape(c.status)} · Last successful import: ${escape(c.synced_at ? new Date(c.synced_at).toLocaleString() : "Not yet synced")}</small></div><button class="small" data-sync="${escape(c.id)}" data-provider="${escape(c.provider)}">Sync data</button></div>`).join("") : '<p class="empty">No live connections yet. Your manual budget works on its own.</p>'}<p class="footer-note">Sync imports provider-cached data. It does not force a paid institution refresh. Reconnect using the provider portal if authorization expires.</p></section><section class="card section-gap"><h2>Investment accounts</h2>${state.investments.length ? state.investments.map((a) => `<div class="connection-row"><div><strong>${escape(a.name)}</strong><small>${escape(a.status)} · Last import ${escape(new Date(a.synced_at).toLocaleString())}</small></div><strong>${a.value_cents === null ? "Unavailable" : money(a.value_cents)}</strong></div>`).join("") : '<p class="empty">Investment values will appear after a successful sync.</p>'}<p class="footer-note">Investment account values are shown separately from budget cash flow. Missing data is unavailable; previously imported values can be stale. No currency conversion or total net-worth calculation is performed.</p></section>`;
}
function clearChat() {
  clearTimeout(historyTimer);
  messages = [];
  conversations = [];
  activeConversation = null;
  chatDrafts = {};
  chatEpoch++;
  chatBusy = false;
  historyOpen = false;
  historyArchived = false;
  conversationBefore = null;
  conversationNext = null;
}
async function loadConversations(offset = 0) {
  const epoch = chatEpoch;
  const r = await api(
    `/api/conversations?archived=${historyArchived ? 1 : 0}&offset=${offset}`,
  );
  if (epoch !== chatEpoch || !state) return;
  conversations = offset ? [...conversations, ...r.threads] : r.threads;
  conversationNext = r.next;
}
async function readConversation(id, older = false) {
  const epoch = chatEpoch;
  const r = await api(
    `/api/conversations/${id}${older ? `?before=${conversationBefore}` : ""}`,
  );
  if (epoch !== chatEpoch || !state) return;
  activeConversation = r.thread;
  messages = older ? [...r.turns, ...messages] : r.turns;
  conversationBefore = r.before;
  chatBusy = messages.some((t) => t.state === "running");
  scheduleHistory();
}
function scheduleHistory() {
  clearTimeout(historyTimer);
  if (!chatBusy || !activeConversation || !state) return;
  const id = activeConversation.id;
  historyTimer = setTimeout(async () => {
    if (!state || activeConversation?.id !== id) return;
    if (document.hidden) {
      scheduleHistory();
      return;
    }
    try {
      await readConversation(id);
      if (page === "chat") render();
    } catch (e) {
      notice(e.message);
      if (state) scheduleHistory();
    }
  }, 1800);
}
function chat() {
  const controls = `<div class="chat-tools"><button data-action="chat-history">Conversations</button><button data-action="chat-new" ${chatBusy ? "disabled" : ""}>New chat</button></div>`;
  if (historyOpen)
    return `<section class="card chat">${controls}<h2>Conversations</h2><button data-action="chat-archived">${historyArchived ? "Show active" : "Show archived"}</button>${conversations.map((t) => `<button class="history-row" data-conversation="${escape(t.id)}"><strong>${t.pinned ? "★ " : ""}${escape(t.title)}</strong><small>${escape(new Date(t.updated_at).toLocaleString())}</small></button>`).join("") || "<p>No saved conversations yet.</p>"}${conversationNext !== null ? '<button data-action="chat-more">More conversations</button>' : ""}</section>`;
  return `<section class="card chat">${controls}${activeConversation ? `<h2>${escape(activeConversation.title)}</h2><details><summary>Manage conversation</summary><div class="chat-tools"><button data-action="chat-rename" ${chatBusy ? "disabled" : ""}>Rename</button><button data-action="chat-pin" ${chatBusy ? "disabled" : ""}>${activeConversation.pinned ? "Unpin" : "Pin"}</button><button data-action="chat-archive" ${chatBusy ? "disabled" : ""}>${activeConversation.archived ? "Restore" : "Archive"}</button><button data-action="chat-delete">Delete</button></div></details>` : "<h2>Ask about your budget</h2>"}<p class="note">Saved on your server until deleted. Each answer reflects its original budget month. ${state.providers.ai ? `Your question and category totals go to ${escape(state.providers.assistant.label)}.` : state.providers.assistant.provider === "disabled" ? "No AI service is needed for a budget summary." : "Finish AI setup in Connect before asking a question."}</p>${!messages.length ? '<div class="suggestions"><button data-question="How much budget do I have left?">How much budget is left?</button><button data-question="Summarize my cash flow this month.">Summarize my cash flow</button></div>' : ""}<div class="messages" role="log" aria-live="polite">${conversationBefore ? '<button data-action="chat-older">Earlier messages</button>' : ""}${messages.map((t) => `<div class="chat-turn"><small>${escape(new Date(t.created_at).toLocaleString())} · Budget month ${escape(t.context.month)}</small><div class="message user"><small>You</small>${escape(t.question)}</div>${t.reply ? `<div class="message"><small>${escape({ ollama: "Local AI", openai: "OpenAI", anthropic: "Anthropic", gemini: "Google Gemini", error: "Provider setup or availability", summary: "Budget summary" }[t.reply.mode] || "Assistant")}${t.reply.model ? ` · ${escape(t.reply.model)}` : ""}</small>${escape(t.reply.answer)}</div>` : ""}${t.state === "running" ? '<p role="status">Preparing your answer. You can return later.</p>' : ""}${["failed", "interrupted"].includes(t.state) ? `<p>${t.state === "interrupted" ? "This reply was interrupted by a restart and was not automatically retried." : "This reply could not finish. Your question is saved."}</p><button data-retry="${escape(t.id)}" ${chatBusy ? "disabled" : ""}>Ask again</button>` : ""}</div>`).join("")}</div><form id="chat-form"><label><span class="sr-only">Ask about your budget</span><textarea name="question" placeholder="Ask about your budget…" maxlength="1200" required ${activeConversation?.archived ? "disabled" : ""}>${escape(chatDrafts[activeConversation?.id || "new"] || "")}</textarea></label><button class="primary" type="submit" ${chatBusy || activeConversation?.archived ? "disabled" : ""}>Ask →</button></form><p class="note">Read-only answers. No account credentials, bank transactions, or merchant names are supplied by the app to the assistant. Each question uses that month’s aggregates; previous messages are saved for reading, not sent to the AI provider. Replies never change your budget.</p></section>`;
}
function openDialog(title, content) {
  dialog.innerHTML = `<div class="dialog-head"><h2 id="editor-title">${escape(title)}</h2><button class="ghost" type="button" data-action="close-dialog" aria-label="Close dialog">${icon("close")}</button></div>${content}<p id="dialog-error" role="alert" class="dialog-error"></p>`;
  dialog.showModal();
}
async function ask(question) {
  if (chatBusy) return;
  const epoch = chatEpoch;
  chatBusy = true;
  try {
    if (!activeConversation)
      activeConversation = await api("/api/conversations", "POST", {
        id: crypto.randomUUID(),
      });
    const id = activeConversation.id;
    const payload = {
      question,
      month: selectedMonth,
      revision: activeConversation.revision,
      requestId: crypto.randomUUID(),
    };
    try {
      await api(`/api/conversations/${id}/messages`, "POST", payload);
    } catch (e) {
      if (!(e instanceof TypeError)) throw e;
      await api(`/api/conversations/${id}/messages`, "POST", payload);
    }
    if (epoch !== chatEpoch || !state) return;
    chatDrafts[id] = "";
    chatDrafts.new = "";
    await readConversation(id);
    await loadConversations();
  } catch (e) {
    notice(e.message);
    if (epoch === chatEpoch && state) {
      chatBusy = false;
      if (activeConversation)
        try {
          await readConversation(activeConversation.id);
        } catch {}
    }
  } finally {
    if (epoch === chatEpoch && state && page === "chat") render();
  }
}
async function plaidConnect() {
  const { link_token } = await api("/api/providers/plaid/link", "POST", {});
  if (!window.Plaid)
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
      const timer = setTimeout(
        () => reject(new Error("Plaid Link timed out. Try connecting again.")),
        15000,
      );
      script.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      script.onerror = () => {
        clearTimeout(timer);
        reject(new Error("Plaid Link could not load"));
      };
      document.head.append(script);
    });
  const handler = window.Plaid.create({
    token: link_token,
    onSuccess: async (public_token) => {
      try {
        await api("/api/providers/plaid/exchange", "POST", { public_token });
        await load();
        notice("Bank connected. Use Sync data to import transactions.");
      } catch (e) {
        notice(e.message);
      } finally {
        handler.destroy();
      }
    },
    onExit: (error) => {
      if (error) notice("Bank connection was not completed. Try again.");
      handler.destroy();
    },
  });
  handler.open();
}
document.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  if (button.closest("#review-edit-form")) return;
  if (button.dataset.selectReview) {
    if (!reviewBusy) {
      reviewSelectedId = button.dataset.selectReview;
      render();
    }
    return;
  }
  if (button.dataset.editReview) {
    editReview(button.dataset.editReview);
    return;
  }
  if (button.dataset.review) {
    await approveReview(button.dataset.review);
    return;
  }
  if (button.dataset.action === "refresh-review") {
    await refreshReview();
    return;
  }
  if (
    button.dataset.action === "close-dialog" &&
    reviewBusy &&
    reviewEditSnapshot
  )
    return;
  if (button.dataset.activityMode) {
    activityReviewOnly = button.dataset.activityMode === "review";
    if (activityReviewOnly) clearReviewFeedback();
    if (state) render();
    return;
  }
  if (button.dataset.page) {
    page = button.dataset.page;
    if (page === "transactions") {
      activityReviewOnly = button.dataset.reviewOnly === "true";
      if (activityReviewOnly) {
        activitySearch = "";
        clearReviewFeedback();
      }
    }
    if (page === "overview") await load();
    if (page === "chat")
      try {
        await loadConversations();
        if (!activeConversation && conversations.length)
          await readConversation(conversations[0].id);
      } catch (e) {
        notice(e.message);
      }
    if (state) render();
    document.querySelector("#main")?.focus({ preventScroll: true });
    return;
  }
  if (button.dataset.question) {
    await ask(button.dataset.question);
    return;
  }
  if (button.dataset.conversation) {
    chatEpoch++;
    historyOpen = false;
    try {
      await readConversation(button.dataset.conversation);
      render();
    } catch (e) {
      notice(e.message);
    }
    return;
  }
  if (button.dataset.retry) {
    const t = messages.find((t) => t.id === button.dataset.retry);
    if (t && confirm("Send this question again as a new assistant request?"))
      await ask(t.question);
    return;
  }
  const action = button.dataset.action;
  button.disabled = true;
  try {
    if (action?.startsWith("chat-")) {
      if (action === "chat-history") {
        historyOpen = !historyOpen;
        await loadConversations();
      }
      if (action === "chat-archived") {
        historyArchived = !historyArchived;
        await loadConversations();
      }
      if (action === "chat-more") await loadConversations(conversationNext);
      if (action === "chat-older")
        await readConversation(activeConversation.id, true);
      if (action === "chat-new") {
        activeConversation = await api("/api/conversations", "POST", {
          id: crypto.randomUUID(),
        });
        messages = [];
        conversationBefore = null;
        historyOpen = false;
        chatBusy = false;
        await loadConversations();
      }
      if (action === "chat-rename") {
        openDialog(
          "Rename conversation",
          `<form id="chat-name-form"><label>Conversation title<input name="title" maxlength="100" value="${escape(activeConversation.title)}" required></label><button class="primary">Save name</button></form>`,
        );
        return;
      }
      if (action === "chat-pin" || action === "chat-archive")
        activeConversation = await api(
          `/api/conversations/${activeConversation.id}`,
          "PATCH",
          {
            revision: activeConversation.revision,
            ...(action === "chat-pin"
              ? { pinned: !activeConversation.pinned }
              : { archived: !activeConversation.archived }),
          },
        );
      if (
        action === "chat-delete" &&
        confirm(
          `Delete “${activeConversation.title}” and all its messages? This cannot be undone.`,
        )
      ) {
        await api(
          `/api/conversations/${activeConversation.id}/delete`,
          "POST",
          {},
        );
        delete chatDrafts[activeConversation.id];
        activeConversation = null;
        messages = [];
        chatBusy = false;
        historyOpen = true;
        await loadConversations();
      }
      if (state) render();
      return;
    }
    if (action === "logout") {
      stateRequests.cancel();
      await api("/api/logout", "POST", {});
      state = null;
      resetReview();
      clearChat();
      activitySearch = "";
      activityReviewOnly = false;
      await loginScreen();
    }
    if (action === "close-dialog") dialog.close();
    if (action === "refresh") await load();
    if (action === "add-category")
      openDialog(
        "Add a budget category",
        `<form id="category-form" class="form-stack"><label>Category name<input name="name" maxlength="40" required placeholder="e.g. Travel"></label><button class="primary" type="submit">Add category</button></form>`,
      );
    if (action === "add-transaction")
      openDialog(
        "Add a transaction",
        `<form id="transaction-form" class="form-stack"><label>Description<input name="description" maxlength="160" required placeholder="What was it for?"></label><div class="field-grid"><label>Date<input name="date" type="date" value="${selectedMonth}-01" required></label><label>Amount (${escape(state.currency)})<input name="amount" inputmode="decimal" type="text" pattern="-?[0-9]+([.][0-9]{1,2})?" required placeholder="0.00"></label></div><label>Category<select name="category_id">${categoryOptions()}</select></label><p class="note">Positive = money out. Negative = money in. Choose Income for pay, an expense category for refunds, or Transfers for moving your own money.</p><button class="primary" type="submit">Add transaction</button></form>`,
      );
    if (action === "plaid-connect") await plaidConnect();
    if (action === "snaptrade-connect") {
      const { url } = await api("/api/providers/snaptrade/connect", "POST", {});
      openDialog(
        "Connect your investments",
        `<p>Open the read-only SnapTrade portal, complete the connection, then return here and sync your data.</p><a href="${escape(url)}" target="_blank" rel="noopener noreferrer">Open SnapTrade portal →</a>`,
      );
      await load();
    }
    if (button.dataset.sync) {
      await api(`/api/providers/${button.dataset.provider}/sync`, "POST", {
        id: button.dataset.sync,
      });
      await load();
      notice("Import finished. Review the latest data and categories.");
    }
  } catch (e) {
    notice(e.message);
  } finally {
    button.disabled = false;
  }
});
document.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (event.target.id === "review-edit-form") {
    await saveReview(event.target, event.submitter?.value === "approve");
    return;
  }
  const form = event.target,
    data = Object.fromEntries(new FormData(form));
  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;
  try {
    if (form.id === "login-form") {
      await api("/api/login", "POST", data);
      await load();
    }
    if (form.id === "category-form") {
      await api("/api/categories", "POST", data);
      dialog.close();
      await load();
      notice("Category added.");
    }
    if (form.id === "transaction-form") {
      await api("/api/transactions", "POST", data);
      dialog.close();
      await load();
      notice("Transaction added.");
    }
    if (form.dataset.budget) {
      await api("/api/budgets", "PUT", {
        month: selectedMonth,
        category_id: form.dataset.budget,
        amount: data.amount,
      });
      await load();
      notice("Monthly budget saved.");
    }
    if (form.id === "chat-name-form") {
      activeConversation = await api(
        `/api/conversations/${activeConversation.id}`,
        "PATCH",
        { revision: activeConversation.revision, title: data.title },
      );
      dialog.close();
      await loadConversations();
      render();
    }
    if (form.id === "chat-form") await ask(data.question);
    if (form.id === "cash-plan-form") await previewCashPlan(form, api, money);
  } catch (e) {
    const error =
      form.id === "login-form"
        ? document.querySelector("#login-error")
        : dialog.open
          ? document.querySelector("#dialog-error")
          : null;
    if (error) error.textContent = e.message;
    else notice(e.message);
  } finally {
    if (button) button.disabled = false;
  }
});
document.addEventListener("change", async (event) => {
  const target = event.target;
  try {
    if (target.id === "month") {
      if (!target.value) return;
      resetReview();
      selectedMonth = target.value;
      await load();
    }
    if (target.dataset.transaction) {
      const transaction = state?.transactions.find(
        (row) => row.id === target.dataset.transaction,
      );
      if (!transaction || transaction.pending || reviewBusy) return;
      if (transaction.reviewed) {
        await api("/api/transactions/category", "PATCH", {
          id: transaction.id,
          category_id: target.value,
        });
      } else {
        await api("/api/transactions/review", "PATCH", {
          id: transaction.id,
          approve: false,
          expected: reviewSnapshot(transaction),
          edits: { category_id: target.value },
        });
      }
      await load();
      notice(
        transaction.reviewed
          ? "Category updated."
          : "Category saved. Approval is still required.",
      );
    }
  } catch (e) {
    notice(e.message);
  }
});
document.addEventListener("input", (event) => {
  if (event.target.matches("#chat-form textarea"))
    chatDrafts[activeConversation?.id || "new"] = event.target.value;
  if (event.target.id === "search") {
    const caret = [event.target.selectionStart, event.target.selectionEnd];
    activitySearch = event.target.value;
    const rows = activityRows();
    document.querySelector("#transaction-list").innerHTML = activityReviewOnly
      ? focusedReview()
      : rows.length
        ? txnList(rows, true)
        : '<p class="empty">No transactions match this view.</p>';
    if (activityReviewOnly) {
      const search = document.querySelector("#search");
      search?.focus({ preventScroll: true });
      search?.setSelectionRange(...caret);
    }
  }
});
load().catch(async (e) => {
  if (!document.querySelector("#login-form")) {
    await loginScreen();
    notice(e.message);
  }
});

// Keep the active chat composer reachable when a mobile keyboard changes the
// visual viewport. Never focus the input automatically or disable page zoom.
function fitChatViewport() {
  const vv = window.visualViewport;
  const input = document.activeElement;
  const composing = page === "chat" && input?.tagName === "TEXTAREA";
  const keyboardOpen =
    composing && vv && vv.scale === 1 && window.innerHeight - vv.height > 120;
  document.body.classList.toggle("keyboard-open", Boolean(keyboardOpen));
  if (keyboardOpen) input.scrollIntoView({ block: "nearest" });
}
window.visualViewport?.addEventListener("resize", fitChatViewport);
document.addEventListener("focusin", fitChatViewport);
document.addEventListener("focusout", () =>
  requestAnimationFrame(fitChatViewport),
);
