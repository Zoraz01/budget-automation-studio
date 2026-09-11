/* Synthetic interaction prototype. Never connects to the application's API. */
const { features, charts } = window.DESIGN;
const $ = (s) => document.querySelector(s);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const usd = (v) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
const cash = (v) => `<span class="money">${usd(v)}</span>`;
const paths = {
  home: "M3 10 12 3l9 7v11h-6v-7H9v7H3z",
  review: "M9 11l2 2 4-4M5 4h14v17H5z",
  activity: "M4 6h16M4 12h16M4 18h16",
  wealth: "M3 7h18v14H3zM3 7V4h15v3M16 13h5",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  spark: "M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
  arrow: "M9 5l7 7-7 7",
};
const icon = (k) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[k] || paths.arrow}"/></svg>`;
const button = (label, action, cls = "") =>
  `<button type="button" class="${cls}" data-action="${action}">${label}</button>`;
const go = (page, label, cls = "quiet") =>
  `<button class="${cls}" data-page="${page}">${label}</button>`;
const heading = (title, sub, eyebrow = "SEPTEMBER 2026") =>
  `<div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p class="subtitle">${sub}</p>`;
const card = (html) => `<section class="card">${html}</section>`;
const stat = (label, value) =>
  `<div><span class="label">${label}</span><strong>${cash(value)}</strong></div>`;
const line = (title, detail, right, action = "transaction") =>
  `<button class="list-button" data-action="${action}"><span class="grow"><strong>${title}</strong><small>${detail}</small></span><span>${right || icon("arrow")}</span></button>`;
const pageLine = (page, title, detail) =>
  `<button class="list-button" data-page="${page}"><span><strong>${title}</strong><small>${detail}</small></span>${icon("arrow")}</button>`;
const field = (label, value, type = "text", name = "") =>
  `<label>${label}<input name="${name || label}" type="${type}" value="${esc(value)}" ${type === "number" ? 'step="0.01" inputmode="decimal"' : ""}></label>`;
const select = (label, values, name = "") =>
  `<label>${label}<select name="${name || label}">${values.map((v) => `<option>${esc(v)}</option>`).join("")}</select></label>`;
const check = (label, checked = true) =>
  `<label class="check"><input type="checkbox" ${checked ? "checked" : ""}>${label}</label>`;
let state = "ready",
  page = "home",
  currentThread = null,
  lastFocus = null,
  period = "1M",
  privacy = false;
let draft = "",
  storageFailed = false;
const KEY = "finance-design-demo-conversations-v2";
const seed = () => [
  {
    id: "sample-month",
    title: "Understanding this month",
    updated: "2026-09-11T09:41:00",
    pinned: true,
    archived: false,
    messages: [
      {
        role: "user",
        text: "Why is my cash flow different from my bank balance?",
      },
      {
        role: "assistant",
        text: "In this synthetic month, $5,200 income minus $3,460 spending and $500 savings transfers leaves +$1,240 liquid cash flow. Your checking balance of $3,250 also includes money from earlier periods. They answer different questions.",
        evidence:
          "September sample · Income $5,200 · Spending $3,460 · Net savings transfers $500. Read-only example; no database query was run.",
      },
    ],
  },
  {
    id: "sample-plan",
    title: "Planning the next paycheck",
    updated: "2026-09-10T16:20:00",
    pinned: false,
    archived: false,
    messages: [
      {
        role: "user",
        text: "What should I check before moving money to savings?",
      },
      {
        role: "assistant",
        text: "Review your buffer, upcoming bills and ordinary spending. The upper saving bound assumes zero day-to-day spending, so it is not a recommendation.",
        evidence: "Synthetic paycheck scenario; projections are estimates.",
      },
    ],
  },
];
let threads;
try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  threads =
    Array.isArray(saved) &&
    saved.every(
      (t) =>
        typeof t.id === "string" &&
        typeof t.title === "string" &&
        Array.isArray(t.messages),
    )
      ? saved
      : seed();
} catch {
  threads = seed();
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(threads));
    storageFailed = false;
  } catch {
    storageFailed = true;
    toast("Browser storage is unavailable. This preview history is temporary.");
  }
}
function toast(text) {
  $("#toast").textContent = text;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($("#toast").textContent = ""), 3600);
}
function modal(title, body) {
  lastFocus = document.activeElement;
  $("#sheet-title").textContent = title;
  $("#sheet-body").innerHTML = body;
  if (!$("#sheet").open) $("#sheet").showModal();
  $("#sheet").scrollTop = 0;
}
function close() {
  if ($("#sheet").open) $("#sheet").close();
  lastFocus?.focus?.();
}
$("#sheet").addEventListener("close", () => lastFocus?.focus?.());
function spec(id) {
  const f = features.find((f) => f.id === id);
  if (!f) return;
  modal(
    `${f.id} · ${f.title}`,
    `<span class="tag">UI implementation contract</span><div class="spec-grid"><div><strong>Placement</strong><p>${esc(f.screen)} · within the five-tab mobile shell</p></div><div><strong>Controls and behavior</strong><p>${esc(f.interaction)}</p></div><div><strong>Semantics and recovery</strong><p>${esc(f.edge)}</p></div><div><strong>Mobile acceptance</strong><p>44px or larger actions, keyboard-visible fields, explicit Back/Close, restored focus, preserved drafts and no horizontal page overflow.</p></div><div><strong>Implementation status</strong><p>Design specification. Public adoption uses configurable providers and invented fixtures. This preview does not change live financial records.</p></div></div><div class="form-actions">${go(f.screen, "Open this screen", "primary full")}</div>`,
  );
}
function notes(screen) {
  return `<details class="notes"><summary>UI plan · ${features.filter((f) => f.screen === screen).length} feature contracts</summary>${features
    .filter((f) => f.screen === screen)
    .map(
      (f) =>
        `<button class="list-button" data-spec="${f.id}"><span><strong>${f.id} · ${f.title}</strong><small>${esc(f.interaction)}</small></span>${icon("arrow")}</button>`,
    )
    .join("")}</details>`;
}
function coverage(query = "") {
  const filtered = features.filter((f) =>
    (f.title + " " + f.interaction + " " + f.screen)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return `<p>${features.length} feature contracts · ${charts.length} chart contracts. Every current page is mapped; new capabilities are labeled in the written specification.</p><label>Find a feature<input id="coverage-search" type="search" placeholder="Try refunds, retirement or history" value="${esc(query)}"></label><div class="coverage" id="coverage-results">${filtered.map((f) => `<article class="coverage-item"><span class="tag">${f.id} / ${f.screen}</span><h3 style="margin-top:9px">${f.title}</h3><p>${esc(f.interaction)}</p><button data-spec="${f.id}">View UI contract</button></article>`).join("")}</div>`;
}
const palette = ["#10b981", "#fb7185", "#60a5fa", "#a78bfa", "#f4c677"];
function chartData(c) {
  const labels =
    c.dates ||
    (c.kind === "line"
      ? c.screen === "retirement"
        ? ["Age 30", "35", "40", "45", "50", "55"]
        : ["Apr", "May", "Jun", "Jul", "Aug", "Sep"]
      : c.labels);
  const series = [
    {
      name: c.kind === "line" ? c.labels[0] : "Actual",
      values: c.values,
      color: palette[0],
    },
  ];
  if (c.compare.length)
    series.push({
      name:
        c.kind === "line"
          ? c.labels[1]
          : c.id === "C07"
            ? "Previous year"
            : "Target",
      values: c.compare,
      color: palette[1],
    });
  if (c.id === "C12")
    series.push({
      name: "Underperform",
      values: [28600, 46000, 67000, 93000, 128000, 176000],
      color: palette[2],
    });
  if (c.id === "C04") series[0].name = "Projected balance";
  if (c.id === "C11") {
    series[0].color = "#fb7185";
    series[1].color = "#10b981";
  }
  if (c.id === "C12") {
    series[1].color = "#a78bfa";
    series[2].color = "#fb7185";
  }
  return { labels, series };
}
function chart(id) {
  const c = charts.find((c) => c.id === id);
  const { labels, series } = chartData(c);
  let graphic = "";
  if (c.kind === "donut") {
    let offset = 0;
    const sum = c.values.reduce((a, b) => a + b, 0);
    const stops = c.values.map((v, i) => {
      const start = offset;
      offset += (v / sum) * 100;
      return `${palette[i]} ${start}% ${offset}%`;
    });
    graphic = `<div class="donut-wrap"><div class="donut" role="img" aria-label="${esc(c.title)}; exact values in legend" style="background:conic-gradient(${stops.join(",")})"></div><div>${c.labels.map((l, i) => `<button class="donut-label" data-select-chart="${c.id}" data-index="${i}"><span style="color:${palette[i]}">●</span> ${l} <b class="money">${Math.round((c.values[i] / sum) * 100)}%</b></button>`).join("")}</div></div>`;
  } else if (c.kind === "heat") {
    graphic = `<p class="chart-caption">September · one month at a time on mobile</p><div class="calendar">${c.values.map((v, i) => `<button data-select-chart="${c.id}" data-index="${i}" aria-label="September ${i + 1}, ${usd(v)} spending" style="background:rgba(16,185,129,${0.06 + (v / 230) * 0.45})">${i + 1}</button>`).join("")}</div>`;
  } else if (c.id === "C03") {
    const max = Math.max(...c.values);
    graphic = `<svg class="chart" viewBox="0 0 324 220" role="img" aria-label="Merchant spending ranking; exact values below">${c.values.map((v, i) => `<text x="0" y="${18 + i * 52}">${esc(c.labels[i])}</text><text x="324" y="${18 + i * 52}" text-anchor="end">${usd(v)}</text><rect x="0" y="${29 + i * 52}" width="324" height="7" rx="3" fill="var(--line)"/><rect x="0" y="${29 + i * 52}" width="${(v / max) * 324}" height="7" rx="3" fill="#10b981"/>`).join("")}</svg>`;
  } else {
    const max = Math.max(...series.flatMap((s) => s.values)) * 1.1;
    const x = (i) => 42 + (i * 260) / Math.max(1, c.values.length - 1);
    const y = (v) => 170 - (v / max) * 135;
    let svg = `<svg class="chart" viewBox="0 0 324 198" role="img" aria-label="${esc(c.title)}. Use the point selector or data table for exact values."><path class="grid" d="M40 35H308M40 102H308M40 170H308"/><text x="1" y="39">${max >= 1000 ? "$" + Math.round(max / 1000) + "k" : usd(max)}</text><text x="9" y="174">$0</text>`;
    if (c.kind === "bar") {
      const slot = 260 / c.values.length;
      series.forEach((s, j) =>
        s.values.forEach((v, i) => {
          svg += `<rect x="${43 + i * slot + j * slot * 0.32}" y="${y(v)}" width="${slot * 0.28}" height="${170 - y(v)}" rx="3" fill="${s.color}" opacity="${j ? 0.55 : 1}"/>`;
        }),
      );
    } else
      series.forEach((s, j) => {
        const d = s.values
          .map((v, i) =>
            i === 0
              ? `M${x(i)},${y(v)}`
              : c.kind === "step"
                ? `H${x(i)}V${y(v)}`
                : `L${x(i)},${y(v)}`,
          )
          .join(" ");
        svg += `<path d="${d}" stroke="${s.color}" stroke-width="2.5" fill="none" ${j ? 'stroke-dasharray="5 4"' : ""}/>`;
      });
    svg +=
      labels
        .map((l, i) =>
          labels.length > 8 && i % 2 === 1 && i !== labels.length - 1
            ? ""
            : `<text x="${c.kind === "bar" ? 47 + (i * 260) / c.values.length : x(i)}" y="192" text-anchor="${i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"}">${esc(l.length > 8 ? l.slice(0, 6) + "…" : l)}</text>`,
        )
        .join("") + "</svg>";
    graphic = svg;
  }
  const first =
    c.kind === "donut" || c.kind === "heat"
      ? `${c.kind === "heat" ? "Sep 1" : c.labels[0]} · ${usd(c.values[0])}`
      : `${labels[0]} · ${series.map((s) => `${s.name} ${usd(s.values[0])}`).join(" · ")}`;
  return `<section class="card chart-card" data-chart="${id}"><div class="row spread"><h2>${c.title}</h2><button class="quiet" data-chart-spec="${id}" aria-label="Design details for ${c.title}">ⓘ</button></div><p class="chart-caption">${c.basis}</p>${graphic}${c.kind !== "donut" && c.kind !== "heat" ? `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join("")}</div><label class="chart-controls">Select a point<input type="range" min="0" max="${c.values.length - 1}" value="0" step="1" data-chart-range="${id}"></label>` : ""}<div class="chart-readout money" id="readout-${id}" aria-live="polite">${first}</div><details><summary>View exact values</summary><div class="data-table"><table><thead><tr><th>Period / category</th>${c.kind === "donut" || c.kind === "heat" ? "<th>Value</th>" : series.map((s) => `<th>${esc(s.name)}</th>`).join("")}</tr></thead><tbody>${c.values.map((v, i) => `<tr><td>${esc(c.kind === "heat" ? "Sep " + (i + 1) : labels[i] || c.labels[i])}</td>${c.kind === "donut" || c.kind === "heat" ? `<td class="money">${usd(v)}</td>` : series.map((s) => `<td class="money">${usd(s.values[i])}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>${["C01", "C02", "C03", "C05", "C07", "C08"].includes(id) ? go("activity", "View related transactions", "quiet full") : ""}</section>`;
}
function chartReadout(id, index) {
  const c = charts.find((c) => c.id === id),
    { labels, series } = chartData(c);
  const text =
    c.kind === "donut" || c.kind === "heat"
      ? `${c.kind === "heat" ? "Sep " + (index + 1) : c.labels[index]} · ${usd(c.values[index])}`
      : `${labels[index]} · ${series.map((s) => `${s.name} ${usd(s.values[index])}`).join(" · ")}`;
  $(`#readout-${id}`).textContent = text;
}
const periods = () =>
  `<div class="segments" aria-label="Reporting period">${["1M", "3M", "6M", "12M", "YTD", "All"].map((p) => `<button data-period="${p}" class="${period === p ? "active" : ""}">${p}</button>`).join("")}</div>`;
function hero() {
  return `<section class="card hero"><span class="label">Liquid cash flow · September</span><div class="number money">+$1,240<span style="font-size:25px;color:var(--muted)">.00</span></div><small class="up">↑ $280 compared with August</small><div class="pair">${stat("Money in", 5200)}${stat("Spending", 3460)}</div><div class="row spread" style="margin-top:12px"><small>Savings rate <b class="money">33.5%</b></small><button class="quiet" data-spec="F03">Savings details</button></div><details><summary>Understand these numbers</summary><p>Income $5,200 − spending $3,460 − net savings transfers $500 = +$1,240 liquid cash flow. Savings rate is (income − spending) / income. Neither value is a current bank balance.</p></details></section>`;
}
const budgetRows = () =>
  [
    ["Housing", 1450, 1600],
    ["Groceries", 248, 450],
    ["Dining", 185, 300],
    ["Transport", 92, 180],
  ]
    .map(
      ([n, a, t]) =>
        `<div class="budget-row"><div class="row spread"><strong>${n}</strong><button class="quiet" data-action="budget">Edit target</button></div><div class="bar-track"><i style="width:${(a / t) * 100}%"></i></div><div class="row spread"><small>${cash(a)} of ${cash(t)}</small><small>${cash(t - a)} left</small></div></div>`,
    )
    .join("");
const screens = {
  home: () =>
    heading(
      "Make room for what matters.",
      "Your month, your priorities, a clearer next step.",
    ) +
    periods() +
    hero() +
    `<button class="attention" data-page="review"><span class="badge">3</span><span class="grow"><strong>Three purchases to review</strong><small>Two categories · one shared expense</small></span>${icon("arrow")}</button><div class="section-head"><h2>Look ahead</h2><span class="tag">Estimates</span></div>` +
    card(
      pageLine(
        "forecast",
        "The next 30 days",
        "Projected low $2,410 · see upcoming bills",
      ) +
        pageLine(
          "paycheck",
          "Plan your next paycheck",
          "September 18 · $2,600 expected",
        ),
    ) +
    `<div class="section-head"><h2>Your monthly plan</h2>${go("budgets", "See all")}</div>` +
    card(budgetRows()) +
    chart("C01") +
    chart("C02") +
    chart("C03") +
    card(
      `<h2>What changed?</h2>${line("Dining rose $65", "Compared with the previous equal period", "+$65")}${line("Transport fell $28", "Tap to inspect the transactions", "−$28")}`,
    ),
  forecast: () =>
    heading(
      "A little foresight.",
      "Explore the cash you expect to have, with the assumptions visible.",
      "PLANNING / 30 DAYS",
    ) +
    card(
      `<div class="label">Starting checking cash</div><div class="number small">${cash(3250)}</div><small>Sample as-of Sep 11 · low ${cash(2410)} on Oct 1</small><label class="check"><input id="burn" type="checkbox" checked>Include typical spending · $32/day</label>`,
    ) +
    chart("C04") +
    card(
      `<h2>Upcoming events</h2>${line("Example payroll", "Sep 18 · expected income", cash(2600), "event")}${line("Sample rent", "Oct 1 · must-pay", cash(-1600), "event")}${line("Music subscription", "Sep 23 · flexible", cash(-12), "event")}`,
    ),
  paycheck: () =>
    heading(
      "Give payday a plan.",
      "Keep bills, a buffer and everyday spending in view.",
      "PLANNING / PAYCHECK",
    ) +
    card(
      `<span class="label">September 18 · 14-day cycle</span><div class="number small">${cash(2600)} expected</div><div class="pair">${stat("On payday", 4400)}${stat("Must-pay bills", 1800)}</div><div class="pair">${stat("Flexible subscriptions", 60)}${stat("Before paycheck", 1800)}</div><div class="form-grid">${field("Keep a buffer of", 300, "number", "floor")}</div><p id="paycheck-bound">Upper saving bound: $2,240 if everyday spending were $0. This is not a suggested transfer.</p>`,
    ) +
    card(
      `<h2>Try a scenario</h2><label style="margin-top:14px">Move to savings<input id="saving" type="range" min="0" max="2240" step="10" value="500"></label><div class="chart-readout money" id="saving-result">Save $500 · $124/day for everyday spending · $300 buffer retained</div><p>Scenario only. No transfer or automated saving is created.</p>`,
    ),
  review: () =>
    heading(
      "A quick check. A clear record.",
      "Review the whole purchase before it leaves your inbox.",
      "REVIEW / 3 PURCHASES",
    ) +
    `<div class="row spread"><span class="tag">1 of 3 · suggested category</span>${button("Bulk approval", "bulk", "quiet")}</div>` +
    card(
      `<span class="label">September 10 · Example card</span><div class="number">${cash(84)}</div><h2>Neighborhood Kitchen</h2><p>AI suggested Dining. You decide.</p><div class="form-grid">${field("Description", "Neighborhood Kitchen")}${select("Category", ["Dining", "Groceries", "Other"])}${select("Account", ["Example card", "Example checking"])}${check("Transfer between my own accounts", false)}</div><div class="row wrap" style="margin-top:15px">${button("Edit amount / details", "transaction")}${button("Split categories", "split")}${go("sharing", "Split with friends", "")}</div><div class="form-actions">${button("Reject", "reject", "danger")}${button("Approve purchase", "approve", "primary grow")}</div>`,
    ) +
    card(
      `<h2>Also in your inbox</h2>${line("Corner Market", "Category needs confirmation", cash(62))}${line("Clothing refund", "Possible original purchase found", cash(22), "refund")}`,
    ),
  sharing: () =>
    heading(
      "Shared, down to the cent.",
      "Prepare a preview. Confirm only when everyone and every amount look right.",
      "REVIEW / SHARED EXPENSE",
    ) +
    card(
      `<span class="tag">Example provider connected</span><div class="number small">${cash(84)} dinner</div><div class="form-grid">${select("Split type", ["Equal", "Exact amounts"])}${check("You · payer")}${check("Sample friend")}${select("Trip (optional)", ["No trip", "Example weekend"])}</div><div class="pair">${stat("Your share", 42)}${stat("Friend owes", 42)}</div><button class="primary full" style="margin-top:20px" data-action="prepare">Prepare sample split</button><p id="share-state">Not prepared. No expense posted.</p>`,
    ) +
    card(
      `<h2>Recovery paths</h2>${line("Prepared and ready", "Inspect normalized shares before posting", "", "prepared")}${line("Posting status unknown", "Resume the same action after a timeout", "", "uncertain")}${line("Preview expired or changed", "Return to selection and prepare again", "", "expired")}${line("Approve without sharing", "Only available when posting is not uncertain", "", "abandon")}`,
    ),
  activity: () =>
    heading(
      "Every detail has a place.",
      "Search, filter and follow the story behind each amount.",
      "ACTIVITY",
    ) +
    `<label>Search transactions<input id="activity-search" type="search" placeholder="Description or notes"></label><div class="row spread" style="margin-top:10px">${button("Filters", "filters")}${button("+ Transaction", "transaction", "primary")}</div><div class="row wrap" style="margin-top:12px"><span class="tag">September</span><span class="tag">All accounts</span></div>` +
    card(
      `<div class="row spread"><small>Sample results · 4 shown</small><small>Filtered outflow ${cash(170.4)}</small></div><div id="transactions">${line("Neighborhood Kitchen", "Sep 10 · Dining · Shared · Review", cash(-84))}${line("Corner Market", "Sep 09 · Groceries · Receipt", cash(-62.4))}${line("City Transit", "Sep 08 · Transport", cash(-24))}${line("Clothing return", "Sep 07 · Refund linked", cash(22), "refund")}</div>`,
    ) +
    `<div class="row spread" style="margin-top:18px"><small>Page 1 of 1 · sample</small><button disabled>Next page</button></div>`,
  trends: () =>
    heading(
      "See the patterns.",
      "Explore days, rolling totals and comparable months.",
      "ANALYTICS / TRENDS",
    ) +
    chart("C05") +
    chart("C06") +
    chart("C07"),
  recurring: () =>
    heading(
      "Know what comes around.",
      "Classify recurring commitments without changing the actual bills.",
      "ANALYTICS / RECURRING",
    ) +
    card(
      `<div class="pair" style="margin:0;padding:0;border:0">${stat("Must-pay / month", 1800)}${stat("Flexible / month", 60)}</div><p>Total recurring ${cash(1860)} · 4 active items</p>`,
    ) +
    card(
      `<h2>Must-pay</h2>${line("Example rent", "Monthly · $1,600 avg · Oct 1 next", cash(1600), "recurring-rule")}${line("Sample loan", "Monthly · $200 avg · Oct 3 next", cash(200), "recurring-rule")}<h2 style="margin-top:20px">Flexible</h2>${line("Example subscriptions", "Monthly equivalent · 2 items", cash(60), "recurring-rule")}<details><summary>Hidden items · 1</summary><p>Excluded from totals, forecasts and paycheck plan.</p>${button("Restore sample membership", "restore", "full")}</details>`,
    ),
  budgets: () =>
    heading(
      "A plan with room to adjust.",
      "Explicit targets and clear progress, one category at a time.",
      "BUDGETS",
    ) +
    field("Budget month", "2026-09", "month") +
    card(
      `<span class="label">Day 11 of 30 · sample budget subset</span><div class="pair">${stat("Budgeted", 2530)}${stat("Spent so far", 1975)}</div><p>${cash(555)} remains across these budgeted categories.</p>`,
    ) +
    card(budgetRows()) +
    chart("C08") +
    card(
      `<h2>Without targets</h2>${line("Other spending", "Set a target or leave unbudgeted", "", "budget")}`,
    ),
  outliers: () =>
    heading(
      "Worth a closer look.",
      "Unusual does not mean wrong. Inspect the context first.",
      "ANALYTICS / OUTLIERS",
    ) +
    card(
      `<span class="label">Average transaction · last 90 days</span><div class="number small">${cash(48)}</div><p>Sample of 86 purchases</p>`,
    ) +
    card(
      `<h2>Unusual purchases</h2>${line("Example electronics", "Category average $75 · inspect deviation", cash(425), "outlier")}`,
    ) +
    card(
      `<h2>Largest purchases</h2>${line("Sample furniture", "Sep 2 · Home · Example card", cash(680))}${line("Example electronics", "Aug 28 · Other · Example card", cash(425))}`,
    ),
  wealth: () =>
    heading(
      "The bigger picture.",
      "Keep accessible money and retirement wealth distinct.",
      "WEALTH / SNAPSHOT",
    ) +
    card(
      `<span class="label">Total net worth</span><div class="number">${cash(39250)}</div><div class="pair">${stat("Current net worth", 10650)}${stat("Liabilities", 10500)}</div><details><summary>See the breakdown</summary><p>Cash $8,750 + accessible investments $12,400 + retirement $28,600 − liabilities $10,500 = $39,250. Current net worth excludes retirement.</p></details>`,
    ) +
    chart("C09") +
    card(
      `<div class="row spread"><h2>Accounts</h2>${button("Add", "asset", "quiet")}</div>${line("Example checking", "Manual sample · as of Sep 11", cash(3250), "asset")}${line("Example savings", "Cash · as of Sep 11", cash(5500), "asset")}${line("Example brokerage", "Accessible · sample provider", cash(12400), "asset")}${line("Example retirement", "Retirement · sample provider", cash(28600), "asset")}`,
    ) +
    card(
      `<div class="row spread"><h2>Liabilities</h2>${button("Add", "liability", "quiet")}</div>${line("Sample loan", "6% APR · $200/month · auto-amortize", cash(10500), "liability")}`,
    ) +
    card(
      pageLine(
        "holdings",
        "Holdings & allocation",
        "Positions, weights and freshness",
      ) +
        pageLine("debt", "Debt payoff", "Compare extra-payment scenarios") +
        pageLine(
          "retirement",
          "Retirement projection",
          "Explore assumptions and outcomes",
        ),
    ),
  holdings: () =>
    heading(
      "Understand what you hold.",
      "Values and weights with their source dates visible.",
      "WEALTH / HOLDINGS",
    ) +
    `<span class="tag">Sample imported Sep 11, 9:41 AM</span>` +
    chart("C10") +
    card(
      `<h2>Positions</h2>${line("DEMO Equity", "Fictional security · 40 × $170 · 54.8%", cash(6800), "holding")}${line("DEMO Bond", "Fictional security · 31 × $100 · 25%", cash(3100), "holding")}${line("Cash and other", "USD · $1,500 cash + $1,000 other", cash(2500), "holding")}<p>These symbols and positions are invented for the design.</p>`,
    ),
  debt: () =>
    heading(
      "Find a faster finish.",
      "Compare possibilities without scheduling a payment.",
      "WEALTH / DEBT",
    ) +
    card(
      `<div class="label">Illustrative payoff comparison</div><div class="pair">${stat("Current principal", 10500)}${stat("Monthly minimum", 200)}</div><label style="margin-top:18px">Extra payment per month<input id="debt-extra" type="range" min="0" max="500" step="25" value="100"></label><div id="debt-result" class="chart-readout">$100 extra/month · compare baseline and accelerated paths</div><p>Chart is an illustrative shape. Final dates and interest require the real amortization engine.</p>`,
    ) +
    chart("C11"),
  retirement: () =>
    heading(
      "Explore your future.",
      "Three scenarios. Assumptions you can see and change.",
      "WEALTH / RETIREMENT",
    ) +
    card(
      `<span class="tag">Illustrative · not a return forecast</span><div class="number small">Age 30 → 55</div><p>Bank saving $6,000/year · payroll retirement $4,000/year · base return 7%</p>${button("Edit all assumptions", "retirement", "full")}`,
    ) +
    chart("C12") +
    card(
      `<h2>Understand the contribution inputs</h2><p>Annual bank saving is separate from payroll retirement contributions and employer match. Historical return must use a complete source set; otherwise show an explicitly chosen estimate.</p>`,
    ),
  categories: () =>
    heading(
      "Make your system yours.",
      "Simple labels, stable history and useful cross-category tags.",
      "WORKSPACE / ORGANIZATION",
    ) +
    card(
      `<div class="row spread"><h2>Expense categories</h2>${button("New", "category", "quiet")}</div>${line("Groceries", "Emerald · 12 sample purchases", "", "category")}${line("Dining", "Rose · 8 sample purchases", "", "category")}<h2 style="margin-top:18px">Income categories</h2>${line("Paycheck", "Blue · 2 sample entries", "", "category")}<details><summary>Archived categories</summary>${button("Restore sample category", "restore", "full")}</details>`,
    ) +
    card(
      `<div class="row spread"><h2>Tags</h2>${button("New", "tag", "quiet")}</div>${line("Example weekend", "4 transactions · $120 spending", "", "tag")}${line("Reimbursable", "2 transactions · $84 spending", "", "tag")}`,
    ),
  connections: () =>
    heading(
      "Connected, with clarity.",
      "Know what is current, what needs attention and what each provider can do.",
      "WORKSPACE / CONNECTIONS",
    ) +
    card(
      `<div class="row spread"><h2>Banking</h2><span class="tag">Sample healthy</span></div><p>Plaid · last imported Sep 11, 9:41 AM. Current personal ingestion remains scheduled.</p>${button("Connection details", "connection", "full")}`,
    ) +
    card(
      `<div class="row spread"><h2>Investments</h2><span class="tag warn">Sample stale</span></div><p>SnapTrade · one source needs reconnection. Last-known values retain their timestamp.</p><div class="row">${button("Reconnect", "connection")}${button("Sync status", "sync")}</div>`,
    ) +
    card(
      `<h2>Shared expenses</h2><p>Prepare and post only after you confirm.</p>${go("sharing", "Open sharing flow", "full")}`,
    ) +
    card(
      `<h2>AI assistant</h2><p>Authenticated read-only analysis with saved conversation history planned. Public adopters choose their own provider.</p>${go("chat", "Saved conversations", "primary full")}`,
    ),
  more: () =>
    heading(
      "Your workspace.",
      "Every tool stays close, without crowding the bottom bar.",
      "MORE",
    ) +
    card(
      pageLine(
        "trends",
        "Trends",
        "Daily calendar, rolling spend and year comparison",
      ) +
        pageLine(
          "recurring",
          "Recurring",
          "Must-pay, flexible and hidden commitments",
        ) +
        pageLine(
          "budgets",
          "Budgets",
          "Targets, actuals, pace and projections",
        ) +
        pageLine("outliers", "Outliers", "Unusual and largest purchases") +
        pageLine("paycheck", "Paycheck plan", "Buffers and savings scenarios") +
        pageLine(
          "forecast",
          "Cash-flow forecast",
          "Next 30 days and upcoming events",
        ),
    ) +
    card(
      pageLine(
        "categories",
        "Categories & tags",
        "Create, organize, archive and restore",
      ) +
        pageLine(
          "connections",
          "Connections",
          "Freshness, reconnect and provider settings",
        ) +
        pageLine(
          "chat",
          "AI conversations",
          "Saved history, evidence and privacy",
        ) +
        pageLine(
          "settings",
          "App & privacy",
          "Appearance, installation and retention",
        ),
    ),
  settings: () =>
    heading(
      "Built for your phone.",
      "A home-screen app should feel intentional at every step.",
      "APP / PRIVACY",
    ) +
    card(
      `<h2>Appearance</h2><label style="margin-top:14px">Color theme<select id="theme"><option value="dark">Dark</option><option value="light">Light</option><option value="auto">System</option></select></label>${button("Toggle amount privacy", "privacy", "full")}`,
    ) +
    card(
      `<h2>Add to your Home Screen</h2><p><b>iPhone:</b> Open your deployed HTTPS app in Safari → Share → Add to Home Screen → turn on Open as Web App when offered → Add.</p><p><b>Android:</b> Open in Chrome → menu → Install app or Add to Home screen. Labels vary by browser.</p><p>This desktop localhost preview is not a phone-accessible deployment.</p>`,
    ) +
    card(
      `<h2>Conversation privacy</h2><p>Production: owner-scoped server history, authenticated access, explicit deletion and configurable retention. Preview: local browser storage only, with invented sample context.</p>${button("History and retention plan", "history-policy", "full")}`,
    ) +
    card(
      `<h2>Home-screen behavior</h2><p>Safe-area padding, own Back controls, preserved filters, keyboard-aware composer, foreground revalidation, clear offline state and no automatic financial writes.</p>${button("Test recovery states", "states", "full")}${button("Sign-out plan", "signout", "quiet full")}`,
    ),
  chat: () => chatScreen(),
};
function chatScreen() {
  if (currentThread) {
    const t = threads.find((t) => t.id === currentThread);
    if (!t) {
      currentThread = null;
      return chatScreen();
    }
    return `${button("‹ Conversations", "thread-back", "quiet back")}<div class="row spread"><div class="grow"><div class="eyebrow">SAVED DEMO CONVERSATION</div><h1 style="font-size:24px">${esc(t.title)}</h1></div>${button("Manage", "thread-manage")}</div><p>September sample context · deterministic replies · no AI call</p><div class="messages" role="log" aria-label="Conversation messages">${t.messages.map((m) => `<article class="message ${m.role === "user" ? "user" : ""}"><small>${m.role === "user" ? "You" : "Finance assistant · sample"}</small>${esc(m.text)}${m.evidence ? `<details><summary>Calculation evidence</summary><small>${esc(m.evidence)}</small></details>` : ""}</article>`).join("")}</div><form id="chat-form" class="composer"><label class="grow"><span class="label">Your message</span><textarea id="message" placeholder="Ask a sample question" maxlength="1200" rows="2">${esc(draft)}</textarea></label><button class="primary" type="submit">Send</button></form><p class="storage-warning" ${storageFailed ? "" : "hidden"}>Storage unavailable: changes last only until this tab closes.</p><p><small>Saved locally on this browser. Real cross-device history is specified for implementation, not enabled by this prototype.</small></p>`;
  }
  return (
    heading(
      "Pick up where you left off.",
      "Conversations stay organized, with evidence and context intact.",
      "AI / SAVED CONVERSATIONS",
    ) +
    `<div class="row spread">${button("+ New conversation", "new-thread", "primary")}${button("Archived", "archived")}</div><label style="margin-top:18px">Search history<input id="chat-search" type="search" placeholder="Find a conversation"></label><div id="thread-list">${threadList()}</div><p><small>Try sending a message and reloading. Demo history stays in this browser; it is never committed to either repository.</small></p>`
  );
}
function threadList(q = "", archived = false) {
  return (
    threads
      .filter(
        (t) =>
          !!t.archived === archived &&
          t.title.toLowerCase().includes(q.toLowerCase()),
      )
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) ||
          b.updated.localeCompare(a.updated),
      )
      .map(
        (t) =>
          `<section class="card thread-card"><button class="list-button" data-thread="${esc(t.id)}"><span><strong>${t.pinned ? "Pinned · " : ""}${esc(t.title)}</strong><small>${t.messages.length} messages · ${esc(t.updated.slice(0, 10))}</small></span>${icon("arrow")}</button><small>${esc(t.messages.at(-1)?.text.slice(0, 100) || "Start your conversation")}</small></section>`,
      )
      .join("") || '<div class="notice">No conversations here yet.</div>'
  );
}
function stateView() {
  if (["loading", "empty", "error", "locked"].includes(state)) {
    const map = {
      loading: [
        "Loading your view",
        "Stable skeletons reserve the layout; no fabricated zero values.",
      ],
      empty: [
        "Nothing here yet",
        "Start with manual records or connect a provider. Existing features remain discoverable.",
      ],
      error: [
        "This view could not update",
        "Your previous data and drafts stay intact. Retry this request when ready.",
      ],
      locked: [
        "Your session needs a refresh",
        "Sign in before restoring private balances and conversation history.",
      ],
    };
    return (
      heading(...map[state], "RECOVERY STATE") +
      (state === "loading"
        ? '<div class="skeleton"></div><div class="skeleton" style="height:110px"></div>'
        : card(
            `<div class="state-card">${icon("spark")}<p>This is the ${state} design state for ${page}.</p>${button("Return to sample data", "ready", "primary")}</div>`,
          )) +
      notes(page)
    );
  }
  return `${state === "stale" || state === "offline" ? `<div class="notice warn">${state === "stale" ? "Last-known sample data · updated Sep 10. One source needs attention." : "Offline preview · last-known data only. Financial writes and AI sending must wait for connection."} ${button("Retry", "ready", "quiet")}</div>` : ""}${screens[page]()}${notes(page)}`;
}
function render() {
  const root =
    page === "chat"
      ? "more"
      : ["home", "review", "activity", "wealth", "more"].includes(page)
        ? page
        : ["forecast", "paycheck"].includes(page)
          ? "home"
          : ["sharing"].includes(page)
            ? "review"
            : ["holdings", "debt", "retirement"].includes(page)
              ? "wealth"
              : "more";
  $("#nav").innerHTML = Object.entries({
    home: "Home",
    review: "Review",
    activity: "Activity",
    wealth: "Wealth",
    more: "More",
  })
    .map(
      ([k, v]) =>
        `<button class="${root === k ? "active" : ""}" data-page="${k}" ${root === k ? 'aria-current="page"' : ""}>${icon(k)}${v}</button>`,
    )
    .join("");
  $("#main").innerHTML =
    (!["home", "review", "activity", "wealth", "more", "chat"].includes(page)
      ? go(root, "‹ Back", "quiet back")
      : "") + stateView();
  $("#main").classList.toggle(
    "chat-screen",
    page === "chat" && !!currentThread,
  );
  document.querySelector("[data-action=privacy]").innerHTML = icon("eye");
  document.querySelector(
    '[aria-label="Open saved AI conversations"]',
  ).innerHTML = icon("spark");
}
function navigate(next, replace = false) {
  if (!screens[next]) return;
  close();
  page = next;
  draft = "";
  if (replace) history.replaceState({ page }, "", `#${page}`);
  else history.pushState({ page }, "", `#${page}`);
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
  $("#main").focus({ preventScroll: true });
}
window.addEventListener("popstate", () => {
  if ($("#sheet").open) {
    close();
    return;
  }
  page = screens[location.hash.slice(1)] ? location.hash.slice(1) : "home";
  render();
});
function form(
  title,
  body,
  note = "Changes apply only to this design preview.",
) {
  modal(
    title,
    `<form class="demo-form"><div class="form-grid">${body}</div><p>${note}</p><div class="form-actions">${button("Cancel", "close", "grow")}<button type="submit" class="primary grow">Save preview</button></div></form>`,
  );
}
const actions = {
  coverage: () => modal("Complete UI coverage", coverage()),
  close,
  ready: () => {
    state = "ready";
    $("#state").value = state;
    render();
  },
  privacy: () => {
    privacy = !privacy;
    document.body.classList.toggle("privacy", privacy);
    toast(
      privacy
        ? "Amounts visually hidden. This is not a security lock."
        : "Amounts visible",
    );
  },
  transaction: () =>
    form(
      "Transaction details",
      field("Description", "Neighborhood Kitchen") +
        `<div class="field-row">${field("Amount", "84.00", "number")}${field("Date", "2026-09-10", "date")}</div>` +
        select("Direction", ["Expense", "Income"]) +
        select("Category", ["Dining", "Groceries", "Other"]) +
        select("Account", ["Example card", "Example checking"]) +
        field("Notes", "Shared dinner · synthetic") +
        check("Transfer between my own accounts", false) +
        check("Tag: Example weekend") +
        `<div class="row wrap">${button("Refund link", "refund")}${button("Receipts", "receipt")}${button("Delete", "delete-transaction", "danger")}</div>`,
    ),
  filters: () =>
    form(
      "Filter activity",
      field("Description or notes", "") +
        select("Direction", ["In & out", "Out", "In"]) +
        select("Account", [
          "All accounts",
          "Example card",
          "Example checking",
        ]) +
        select("Category", ["All categories", "Dining", "Groceries"]) +
        select("Tag", ["All tags", "Example weekend", "Reimbursable"]) +
        field("From", "2026-09-01", "date") +
        field("To", "2026-09-30", "date"),
      "The implementation must persist filters and list position on return. Preview does not query live transactions.",
    ),
  receipt: () =>
    modal(
      "Receipts and attachments",
      `<p>Image/PDF · up to 15 MB · authenticated access only</p>${line("Sample receipt.pdf", "Invented file entry · 84 KB", "View", "receipt-view")}<p>The production picker supports camera/photos/files where available. Upload progress, too-large, wrong-type and retry states are specified.</p>${button("Show upload error state", "receipt-error", "full")}${button("Delete attachment preview", "delete-file", "danger full")}`,
    ),
  "receipt-view": () =>
    modal(
      "Sample receipt",
      `<div class="card"><h2>Neighborhood Kitchen</h2><p>Invented receipt · Sep 10, 2026</p><div class="pair">${stat("Total", 84)}${stat("Paid", 84)}</div></div><p>No actual document is loaded.</p>`,
    ),
  "receipt-error": () =>
    modal(
      "Upload could not complete",
      '<div class="notice warn">Example: file exceeds 15 MB. Choose a smaller image or PDF. Your transaction draft remains intact.</div>' +
        button("Back to attachments", "receipt", "full"),
    ),
  refund: () =>
    modal(
      "Link a refund",
      `<p>Choose the original purchase. Confirming nets the refund against spending instead of treating it as new income.</p>${line("Example clothing purchase", "Aug 28 · same merchant · exact amount", cash(22), "refund-confirm")}<div class="notice">No plausible match? Leave unlinked and choose another original later.</div>${button("Unlink current example", "refund-confirm", "full")}`,
    ),
  "refund-confirm": () => {
    close();
    toast("Refund relationship previewed. No records changed.");
  },
  split: () =>
    form(
      "Split categories",
      `<div class="notice">Purchase $84.00 · parts must sum exactly in integer cents</div>${select("Part 1 category", ["Dining", "Groceries"])}${field("Part 1 amount", 42, "number", "part1")}${select("Part 2 category", ["Groceries", "Dining"])}${field("Part 2 amount", 42, "number", "part2")}<p id="split-remaining" aria-live="polite">Remaining: $0.00</p>${button("Add another part", "add-part", "full")}`,
    ),
  "add-part": () => {
    const container = document.querySelector(".demo-form .form-grid");
    container.insertAdjacentHTML(
      "beforeend",
      field("Additional part amount", 0, "number", "extra-part"),
    );
  },
  approve: () =>
    modal(
      "Approve this purchase?",
      `<p>Neighborhood Kitchen · $84.00 · Dining · Example card</p><p>Production learns this merchant/category choice and advances the Review queue.</p>${button("Confirm sample approval", "confirmed", "primary full")}`,
    ),
  bulk: () =>
    modal(
      "Approve eligible purchases?",
      `<div class="pair"><div><span class="label">Eligible</span><strong>2 purchases</strong></div><div><span class="label">Skipped</span><strong>1 purchase</strong></div></div><p>One unfinished shared expense remains in Review. Eligible purchases are listed before the final confirmation.</p>${button("Preview bulk approval", "confirmed", "primary full")}`,
    ),
  reject: () =>
    modal(
      "Reject this purchase?",
      `<p>Production removes it from Review and suppresses re-import of its source identity. Shared expenses already posted or uncertain cannot be rejected.</p>${button("Confirm sample rejection", "confirmed", "danger full")}`,
    ),
  confirmed: () => {
    close();
    toast("Preview confirmed. No financial records changed.");
  },
  prepare: () => {
    $("#share-state").textContent =
      "Sample prepared · inspect normalized shares before posting.";
    actions.prepared();
  },
  prepared: () =>
    modal(
      "Inspect the prepared split",
      `<span class="tag">Sample prepared · expires in 10 minutes</span><div class="number small">${cash(84)}</div><p>You paid $84.00 · your share $42.00 · Sample friend owes $42.00.</p><p>Production uses the same stable purchase and provider action IDs across retries.</p>${button("Post sample & approve", "share-posted", "primary full")}`,
    ),
  "share-posted": () => {
    close();
    if ($("#share-state"))
      $("#share-state").textContent =
        "Sample posted and approved. No provider was called.";
    toast("Sample state: posted. No external expense created.");
  },
  uncertain: () =>
    modal(
      "Confirm the existing action",
      `<span class="tag warn">Posting status unknown</span><p>A dropped connection does not prove failure. Keep the same action ID, lock incompatible edits and query status before deciding to retry.</p>${button("Simulate status confirmed", "share-posted", "primary full")}`,
    ),
  expired: () =>
    modal(
      "Prepare a fresh preview",
      `<p>The preview expired or the transaction changed. Show the changed fields and require a new preparation. An uncertain commit must be resolved first.</p>${button("Back to selection", "close", "full")}`,
    ),
  abandon: () =>
    modal(
      "Approve without sharing?",
      `<p>Only a known unposted preview can be abandoned. The full purchase remains cash outflow. No reimbursement is invented.</p>${button("Confirm sample choice", "confirmed", "primary full")}`,
    ),
  event: () =>
    modal(
      "Expected event",
      `<h3>Example payroll · September 18</h3><p>Expected $2,600 based on recurring history. This is a projection; the actual deposit is not confirmed.</p>${go("recurring", "Inspect recurring rules", "full")}`,
    ),
  budget: () =>
    form(
      "Category target",
      select("Category", ["Groceries", "Dining", "Housing", "Transport"]) +
        field("Monthly target", 450, "number", "budget-target") +
        `<p>Projected month-end values are estimates. Removing a target does not remove the category.</p>${button("Remove target preview", "confirmed", "danger full")}`,
    ),
  "recurring-rule": () =>
    form(
      "Recurring commitment",
      `<h3>Example subscription</h3><p>Monthly cadence · average $12 · expected Sep 23 · $12/month equivalent</p>` +
        select("Classification", ["Must-pay", "Flexible", "Hidden"]),
      "Hidden items are excluded from totals, forecasts and paycheck planning. This preview does not cancel a subscription.",
    ),
  restore: () => toast("Restoration previewed; no production data changed."),
  outlier: () =>
    modal(
      "Why this stands out",
      `<p>Example electronics · $425 versus category average $75. Show the backend deviation metric with its actual definition and sample size; do not relabel a z-score as a spending multiple.</p>${button("Open purchase", "transaction", "full")}`,
    ),
  asset: () =>
    form(
      "Account",
      field("Name", "Example account") +
        select("Kind", [
          "Checking",
          "Savings",
          "Investment",
          "Retirement",
          "Other",
        ]) +
        field("Balance", 3250, "number") +
        check("Retirement account", false) +
        `<small>Source: manual sample · provider-owned fields are labeled separately.</small>${button("Delete account preview", "delete-account", "danger full")}`,
    ),
  liability: () =>
    form(
      "Liability",
      field("Name", "Example loan") +
        select("Kind", ["Loan", "Credit card", "Mortgage", "Other"]) +
        field("Balance", 10500, "number") +
        field("APR %", 6, "number") +
        field("Monthly payment", 200, "number") +
        check("Automatically amortize monthly") +
        button("Delete liability preview", "delete-account", "danger full"),
    ),
  holding: () =>
    modal(
      "Holding details",
      `<h3>DEMO Equity · invented security</h3><p>Example brokerage · 40 units × $170 = $6,800. Weight 54.8%. USD. Sample price as of Sep 11.</p><p>Missing quantities/prices remain unavailable, and the account/source timestamp stays visible.</p>`,
    ),
  retirement: () =>
    form(
      "Retirement assumptions",
      field("Current age (from profile)", 30, "number") +
        field("Retire at age", 55, "number") +
        field("Bank saving per year", 6000, "number") +
        field("Payroll retirement + match per year", 4000, "number") +
        field("Base return %", 7, "number") +
        field("Upside spread %", 3, "number") +
        field("Downside spread %", 3, "number"),
      "Explicit Save replaces accidental blur-save behavior. The prototype shows illustrative scenarios, not a financial forecast.",
    ),
  category: () =>
    form(
      "Category",
      field("Name", "Groceries") +
        select("Kind", ["Expense", "Income"]) +
        select("Color", ["Emerald", "Blue", "Rose", "Amber", "Purple"]) +
        `<p>12 sample transactions use this category. Delete is unavailable while in use; archive preserves history.</p>${button("Archive / restore preview", "confirmed", "full")}`,
    ),
  tag: () =>
    form(
      "Tag",
      field("Name", "Example weekend") +
        select("Color", ["Emerald", "Blue", "Rose", "Amber"]) +
        button("Archive / restore preview", "confirmed", "full") +
        button("Delete tag preview", "delete-tag", "danger full"),
    ),
  connection: () =>
    modal(
      "Provider connection",
      `<p>Connect → consent → return to the original screen. Show denied consent, expired link and reconnect states. Tokens remain server-side.</p><p>This is a provider-neutral design. No real OAuth flow starts from the prototype.</p>${button("Simulate connected state", "confirmed", "primary full")}`,
    ),
  sync: () =>
    modal(
      "Sync status",
      `<span class="tag warn">One sample source stale</span><p>Keep last-success time, current attempt, per-account errors and retry status visible. Do not force a billable refresh as part of opening the app.</p>${button("Simulate successful refresh", "confirmed", "primary full")}`,
    ),
  "history-policy": () =>
    modal(
      "History and retention",
      `<p>Production stores conversations on the authenticated server, isolated by owner/workspace. Default: retain until deleted; offer 30/90/365-day automatic retention and explain backup expiry separately.</p><p>Messages, evidence, dates and durable request IDs survive restart. Model context is separately bounded. Clear sign-out caches; do not cache financial API responses in a service worker.</p><p>Preview history is browser-local. Clearing browser data removes it.</p>${button("Reset only demo conversation history", "reset-history", "danger full")}`,
    ),
  states: () => {
    toast(
      "Use Preview state at the top: loading, empty, error, stale, offline or session expired.",
    );
    window.scrollTo(0, 0);
  },
  signout: () =>
    modal(
      "Sign-out behavior",
      `<p>Clear sensitive in-memory content and local drafts, revoke the session as supported, and require sign-in before loading saved server conversations. Signing out does not delete server history.</p>`,
    ),
  "new-thread": () => {
    const id = crypto.randomUUID();
    threads.unshift({
      id,
      title: "New conversation",
      updated: new Date().toISOString(),
      pinned: false,
      archived: false,
      messages: [],
    });
    currentThread = id;
    persist();
    render();
  },
  "thread-back": () => {
    draft = "";
    currentThread = null;
    render();
  },
  archived: () => modal("Archived conversations", threadList("", true)),
  "thread-manage": () => {
    const t = threads.find((t) => t.id === currentThread);
    modal(
      "Manage conversation",
      `<form id="rename-form" class="form-grid">${field("Conversation title", t.title, "text", "title")}<button class="primary" type="submit">Save title</button></form><div class="row wrap" style="margin-top:18px">${button(t.pinned ? "Unpin" : "Pin", "pin-thread")}${button(t.archived ? "Restore" : "Archive", "archive-thread")}${button("Delete", "delete-thread", "danger")}</div>`,
    );
  },
  "pin-thread": () => {
    const t = threads.find((t) => t.id === currentThread);
    t.pinned = !t.pinned;
    persist();
    close();
    render();
  },
  "archive-thread": () => {
    const t = threads.find((t) => t.id === currentThread);
    t.archived = !t.archived;
    persist();
    close();
    currentThread = null;
    render();
  },
  "delete-thread": () =>
    modal(
      "Delete this demo conversation?",
      `<p>This removes the selected conversation from this browser’s demo history.</p>${button("Delete demo conversation", "confirm-delete-thread", "danger full")}`,
    ),
  "confirm-delete-thread": () => {
    threads = threads.filter((t) => t.id !== currentThread);
    currentThread = null;
    persist();
    close();
    render();
  },
  "reset-history": () =>
    modal(
      "Reset demo history?",
      `<p>Remove locally entered demo messages and restore the two invented examples?</p>${button("Reset demo history", "confirm-reset", "danger full")}`,
    ),
  "confirm-reset": () => {
    threads = seed();
    currentThread = null;
    persist();
    close();
    render();
  },
};
for (const [a, label] of Object.entries({
  "delete-transaction": "transaction and linked attachments",
  "delete-file": "attachment",
  "delete-account": "account or liability",
  "delete-tag": "tag associations, preserving transactions",
}))
  actions[a] = () =>
    modal(
      "Review deletion",
      `<p>Production must explain the impact on ${label} and require explicit confirmation. Posted or uncertain shared activity stays protected.</p>${button("Confirm deletion preview", "confirmed", "danger full")}`,
    );
document.addEventListener("click", (e) => {
  const target = e.target.closest("button");
  if (!target) return;
  if (target.dataset.page) navigate(target.dataset.page);
  else if (target.dataset.action) actions[target.dataset.action]?.();
  else if (target.dataset.spec) spec(target.dataset.spec);
  else if (target.dataset.thread) {
    close();
    currentThread = target.dataset.thread;
    page = "chat";
    render();
  } else if (target.dataset.period) {
    period = target.dataset.period;
    render();
    toast(
      "Selected " +
        period +
        ". Sample values remain September fixtures; production changes the query range.",
    );
  } else if (target.dataset.selectChart) {
    chartReadout(target.dataset.selectChart, Number(target.dataset.index));
  } else if (target.dataset.chartSpec) {
    const c = charts.find((c) => c.id === target.dataset.chartSpec);
    modal(
      `${c.id} · ${c.title}`,
      `<div class="spec-grid"><div><strong>Data and units</strong><p>${c.basis}</p></div><div><strong>Touch and drilldown</strong><p>${c.tap}</p></div><div><strong>Missing data and semantics</strong><p>${c.edge}</p></div><div><strong>Shared chart states</strong><p>Loading skeleton, empty, partial/stale, error with retry, large text and reduced motion. Every chart has a keyboard-operable selector and exact-value alternative.</p></div></div>`,
    );
  }
});
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.dataset.chartRange)
    chartReadout(el.dataset.chartRange, Number(el.value));
  if (el.id === "message") {
    draft = el.value;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 132) + "px";
  }
  if (el.id === "chat-search")
    $("#thread-list").innerHTML = threadList(el.value);
  if (el.id === "coverage-search") {
    const tmp = document.createElement("div");
    tmp.innerHTML = coverage(el.value);
    $("#coverage-results").innerHTML =
      tmp.querySelector("#coverage-results").innerHTML;
  }
  if (el.id === "activity-search")
    document
      .querySelectorAll("#transactions .list-button")
      .forEach(
        (row) =>
          (row.hidden = !row.textContent
            .toLowerCase()
            .includes(el.value.toLowerCase())),
      );
  if (el.id === "saving" || el.name === "floor") {
    const floor = Number(document.querySelector("[name=floor]")?.value || 0),
      max = Math.max(0, 4400 - 1800 - 60 - floor);
    $("#saving").max = max;
    const saving = Number($("#saving").value);
    $("#saving-result").textContent =
      `Save ${usd(saving)} · ${usd(Math.max(0, (max - saving) / 14))}/day · ${usd(floor)} buffer retained`;
    $("#paycheck-bound").textContent =
      `Upper saving bound: ${usd(max)} if everyday spending were $0. This is not a suggested transfer.`;
  }
  if (el.id === "debt-extra")
    $("#debt-result").textContent =
      `${usd(Number(el.value))} extra/month selected. Production recalculates dates and interest; this chart remains illustrative.`;
  if (["part1", "part2", "extra-part"].includes(el.name)) {
    const total = [
      ...document.querySelectorAll(
        "input[name=part1],input[name=part2],input[name=extra-part]",
      ),
    ].reduce((s, i) => s + Math.round(Number(i.value || 0) * 100), 0);
    $("#split-remaining").textContent =
      `Remaining: ${((8400 - total) / 100).toFixed(2)}`;
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "state") {
    state = e.target.value;
    render();
  }
  if (e.target.id === "theme") {
    const v = e.target.value;
    document.documentElement.dataset.theme =
      v === "auto"
        ? matchMedia("(prefers-color-scheme:dark)").matches
          ? "dark"
          : "light"
        : v;
  }
  if (e.target.id === "burn") {
    const c = charts.find((c) => c.id === "C04");
    c.values = e.target.checked
      ? [3250, 2770, 5010, 4210, 2410, 4650]
      : [3250, 2930, 5330, 4690, 3050, 5610];
    const old = document.querySelector("[data-chart=C04]");
    old.outerHTML = chart("C04");
    toast("Typical-spending scenario updated using invented data.");
  }
});
document.addEventListener("submit", (e) => {
  e.preventDefault();
  if (e.target.id === "chat-form") {
    const text = draft.trim();
    if (!text) return;
    if (state === "offline") {
      toast("Reconnect before sending. Your draft remains here.");
      return;
    }
    const t = threads.find((t) => t.id === currentThread);
    t.messages.push({ role: "user", text });
    if (t.title === "New conversation") t.title = text.slice(0, 48);
    t.messages.push({
      role: "assistant",
      text: "Saved demo reply: September income is $5,200, spending is $3,460 and net savings transfers are $500. Liquid cash flow is +$1,240. This is a deterministic preview, not an AI analysis of your question.",
      evidence:
        "Synthetic September context. No bank data or model request. Old answers will retain their own as-of dates in production.",
    });
    t.updated = new Date().toISOString();
    draft = "";
    persist();
    render();
    $(".composer")?.scrollIntoView({ block: "end" });
    return;
  }
  if (e.target.id === "rename-form") {
    const t = threads.find((t) => t.id === currentThread);
    const title = new FormData(e.target).get("title").trim();
    if (!title) {
      toast("Enter a title.");
      return;
    }
    t.title = title.slice(0, 120);
    persist();
    close();
    render();
    return;
  }
  if (e.target.matches(".demo-form")) {
    const nums = [...e.target.querySelectorAll("input[type=number]")];
    if (
      nums.some((n) => !Number.isFinite(Number(n.value)) || Number(n.value) < 0)
    ) {
      toast("Use a valid nonnegative number. Your draft is preserved.");
      return;
    }
    if ($("#split-remaining")) {
      const cents = [
        ...e.target.querySelectorAll(
          "input[name=part1],input[name=part2],input[name=extra-part]",
        ),
      ].reduce((sum, i) => sum + Math.round(Number(i.value) * 100), 0);
      if (cents !== 8400) {
        toast("Split parts must total exactly $84.00.");
        return;
      }
    }
    close();
    toast(
      "Preview saved. Form layout reviewed; no production records changed.",
    );
  }
});
const vv = window.visualViewport;
function viewport() {
  if (!vv) return;
  document.documentElement.style.setProperty(
    "--viewport-height",
    `${vv.height}px`,
  );
  document.documentElement.style.setProperty(
    "--viewport-top",
    `${vv.offsetTop}px`,
  );
  const editing = ["INPUT", "TEXTAREA", "SELECT"].includes(
    document.activeElement?.tagName,
  );
  document.body.classList.toggle(
    "keyboard-open",
    editing && vv.scale === 1 && window.innerHeight - vv.height > 120,
  );
}
vv?.addEventListener("resize", viewport);
vv?.addEventListener("scroll", viewport);
document.addEventListener("focusin", viewport);
document.addEventListener("focusout", viewport);
page = screens[location.hash.slice(1)] ? location.hash.slice(1) : "home";
history.replaceState({ page }, "", `#${page}`);
render();
