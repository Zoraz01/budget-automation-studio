window.DESIGN = {
  features: [
    {
      id: "F01",
      screen: "home",
      title: "Period controls",
      interaction:
        "Month / 3M / 6M / 12M / YTD / all-time plus custom dates; keep selections on back navigation.",
      edge: "All-time hides misleading prior-window comparisons; invalid ranges stay inline.",
    },
    {
      id: "F02",
      screen: "home",
      title: "Cash-flow summary",
      interaction:
        "Liquid cash flow, income, spending and savings rate; tap a number for the exact definition and contributing transactions.",
      edge: "Separate period movement from current balances; unavailable savings rate is a dash, never zero.",
    },
    {
      id: "F03",
      screen: "home",
      title: "Savings breakdown",
      interaction:
        "Show accessible savings contributions/withdrawals, retirement contributions and unmatched destinations in a disclosure.",
      edge: "Unmatched transfers remain unresolved; do not guess the destination or count withdrawals as earned income.",
    },
    {
      id: "F04",
      screen: "home",
      title: "Spending insights",
      interaction:
        "Rank increased and decreased categories; show current, previous, dollar change and period.",
      edge: "Tap to filtered Activity; absent prior data says no comparison.",
    },
    {
      id: "F05",
      screen: "home",
      title: "Source freshness",
      interaction:
        "Per-provider as-of time, partial data and reconnect state in a status sheet.",
      edge: "Missing is unavailable; stale data keeps its date; refresh does not imply a paid institution refresh.",
    },
    {
      id: "F06",
      screen: "forecast",
      title: "30-day outlook",
      interaction:
        "Starting cash, source, lowest balance/date, recurring income and bill agenda; day selection opens its events.",
      edge: "Flow-derived starting cash is explicitly estimated; no events produces a setup message, not a disappearing card.",
    },
    {
      id: "F07",
      screen: "forecast",
      title: "Typical spending toggle",
      interaction:
        "Switch baseline daily spending on/off while keeping the same future events.",
      edge: "Show daily estimate and assumptions; this scenario is not a payment instruction.",
    },
    {
      id: "F08",
      screen: "paycheck",
      title: "Next paycheck",
      interaction:
        "Amount/date, cycle length, before/after paycheck cash, must-pay bills and flexible subscriptions.",
      edge: "Missing payroll or balance keeps the module visible with the missing prerequisite.",
    },
    {
      id: "F09",
      screen: "paycheck",
      title: "Savings scenarios",
      interaction:
        "Buffer-floor input, possible saving amounts, investment pace, money/day and cash remaining.",
      edge: "Upper saving bound assumes zero everyday spending; label it as a bound, not a recommendation.",
    },
    {
      id: "F10",
      screen: "review",
      title: "Review queue",
      interaction:
        "Count, grouped purchase identity, AI-suggestion badge and focused purchase card with next/previous controls.",
      edge: "Empty inbox is success; provider-pending charges remain distinguishable from posted items awaiting review.",
    },
    {
      id: "F11",
      screen: "review",
      title: "Edit review purchase",
      interaction:
        "Description, amount, category, account and transfer classification before approval; date shown with details.",
      edge: "Save failures preserve the draft; posted or uncertain shared expenses block incompatible edits.",
    },
    {
      id: "F12",
      screen: "review",
      title: "Approve purchase",
      interaction:
        "Preview final category and amount, then approve and learn the merchant rule.",
      edge: "Disable duplicate submission; success advances queue and updates count; failures keep the card.",
    },
    {
      id: "F13",
      screen: "review",
      title: "Bulk approval",
      interaction: "List eligible and skipped purchases before confirmation.",
      edge: "Unfinished shared expenses stay in Review; report approved and skipped counts separately.",
    },
    {
      id: "F14",
      screen: "review",
      title: "Reject purchase",
      interaction:
        "Confirm exclusion and explain permanent import suppression for that source identity.",
      edge: "Cannot discard posted or uncertain shared-expense activity; surface the repair path.",
    },
    {
      id: "F15",
      screen: "review",
      title: "Category split",
      interaction:
        "Add/remove parts with category and decimal amount; sticky total and cents remaining; at least two parts.",
      edge: "Exact conservation in integer cents; return validation beside the offending part.",
    },
    {
      id: "F16",
      screen: "review",
      title: "Refund suggestion",
      interaction:
        "Show suggested original date, merchant and amount; link only on explicit tap.",
      edge: "Multiple candidates require choice; linking changes net spending rather than creating income.",
    },
    {
      id: "F17",
      screen: "sharing",
      title: "Expense-sharing connection",
      interaction:
        "Connect with OAuth, scope explanation, cancel/denied/expired callback, reconnect and disconnect.",
      edge: "Keep tokens server-side; return to the exact purchase after auth; uncertain commit blocks disconnect.",
    },
    {
      id: "F18",
      screen: "sharing",
      title: "People and trip selection",
      interaction:
        "Search private contacts, include payer, choose optional trip, equal or exact split.",
      edge: "Do not expose contact names in public fixtures; duplicate/missing participants fail inline.",
    },
    {
      id: "F19",
      screen: "sharing",
      title: "Prepare split",
      interaction:
        "Normalized shares, payer, total and receivable preview with expiry.",
      edge: "Preparation creates no posted expense; changed purchase or selection invalidates prior preview.",
    },
    {
      id: "F20",
      screen: "sharing",
      title: "Post and approve",
      interaction:
        "Explicit action commits the prepared action then finalizes local approval.",
      edge: "Show posting and posted states; retry the same action after a dropped connection, never recreate it.",
    },
    {
      id: "F21",
      screen: "sharing",
      title: "Reconcile or abandon",
      interaction:
        "Check uncertain status, expired preview, changed transaction, failed provider response and approve-without-sharing path.",
      edge: "Uncertain or posted actions cannot be abandoned; a timeout is not proof of failure.",
    },
    {
      id: "F22",
      screen: "activity",
      title: "Search and filters",
      interaction:
        "Search description/notes; direction, account, category, tag, from/to; apply/reset sheet and active chips.",
      edge: "Preserve filter state and list position when returning from a transaction or chart.",
    },
    {
      id: "F23",
      screen: "activity",
      title: "Transaction list and totals",
      interaction:
        "Date groups, amount/direction, category, source, notes, review/reward/transfer/refund/attachment/share badges; filtered totals.",
      edge: "Large datasets use bounded pages, visible result count and next/previous or load-more controls.",
    },
    {
      id: "F24",
      screen: "activity",
      title: "Create/edit transaction",
      interaction:
        "Date, direction, description, amount, category, account, notes, tags and own-account transfer checkbox.",
      edge: "Validate required fields and decimal cents; keep failed edits; do not rewrite posted shared activity.",
    },
    {
      id: "F25",
      screen: "activity",
      title: "Delete transaction",
      interaction:
        "Impact sheet explains linked files and history before confirmation.",
      edge: "Block committed/uncertain shared expenses; keep failure visible instead of removing the row optimistically.",
    },
    {
      id: "F26",
      screen: "activity",
      title: "Refund linking",
      interaction:
        "Candidate originals with date, amount and exact-match marker; link, inspect cumulative refunds, unlink.",
      edge: "No candidates says why; over-refund and incompatible direction require validation.",
    },
    {
      id: "F27",
      screen: "activity",
      title: "Receipt attachments",
      interaction:
        "Existing file list, image/PDF picker, progress, view/download and delete confirmation; show 15 MB limit.",
      edge: "Files require authenticated requests; no public URLs or offline caching; camera is optional progressive enhancement.",
    },
    {
      id: "F28",
      screen: "activity",
      title: "Transaction tags",
      interaction:
        "Choose multiple tags, create one inline, preserve selected archived tags, save alongside transaction.",
      edge: "Tag failure must not silently look like full transaction success; allow retry of unfinished save.",
    },
    {
      id: "F29",
      screen: "trends",
      title: "Trend explorer",
      interaction:
        "Daily calendar, rolling 30/90-day totals and year comparisons with selected-date readouts.",
      edge: "Comparisons use equal periods and literal aggregate definitions, not misleading normalized labels.",
    },
    {
      id: "F30",
      screen: "recurring",
      title: "Recurring summary",
      interaction:
        "Must-pay, flexible and total monthly equivalents with active count.",
      edge: "Explain cadence conversion and estimates; zero items prompts history import rather than fabricated bills.",
    },
    {
      id: "F31",
      screen: "recurring",
      title: "Recurring rule editing",
      interaction:
        "Each merchant shows cadence, average, next expected, monthly equivalent; set must-pay/flexible/hidden and restore hidden.",
      edge: "Hidden items excluded from recurring totals, forecast and paycheck planning; failure rolls back classification.",
    },
    {
      id: "F32",
      screen: "budgets",
      title: "Monthly budget overview",
      interaction:
        "Month, day elapsed, target, actual and remaining; distinguish unbudgeted spend.",
      edge: "No targets and zero targets are distinct; linked refunds reduce effective spending.",
    },
    {
      id: "F33",
      screen: "budgets",
      title: "Target editor",
      interaction:
        "Tap category to edit/set/remove monthly target with explicit Save/Cancel; decimal keypad.",
      edge: "Replace blur autosave with clear save feedback; validate nonnegative values and preserve failed drafts.",
    },
    {
      id: "F34",
      screen: "budgets",
      title: "Budget pace",
      interaction:
        "Actual versus target, projected month-end spend and pace warning in text and bar.",
      edge: "Do not extrapolate a future month or hide overspend behind a capped bar; show excess as a number.",
    },
    {
      id: "F35",
      screen: "outliers",
      title: "Unusual purchases",
      interaction:
        "Category average, purchase amount and deviation measure next to each flagged row.",
      edge: "An outlier is not fraud; show metric definition and insufficient-sample state.",
    },
    {
      id: "F36",
      screen: "outliers",
      title: "Largest purchases",
      interaction:
        "Top purchases over 90 days, account/category and average-transaction summary.",
      edge: "Open the exact purchase rather than a broad merchant search; empty ranges remain visible.",
    },
    {
      id: "F37",
      screen: "wealth",
      title: "Net-worth summary",
      interaction:
        "Total net worth, current net worth and liabilities; breakdown distinguishes cash, accessible investments and retirement.",
      edge: "Current net worth definition stays consistent with backend; absent source balance is never zero.",
    },
    {
      id: "F38",
      screen: "wealth",
      title: "Accounts",
      interaction:
        "List manual and linked assets with name, kind, amount, retirement flag and source date.",
      edge: "Provider-owned balances show provenance; edit/delete rules must not disguise imported versus manual values.",
    },
    {
      id: "F39",
      screen: "wealth",
      title: "Account editor",
      interaction:
        "Name, kind, balance and retirement classification; create, edit and delete confirmation.",
      edge: "Retirement kind implies retirement flag; preserve manual assets when connections change.",
    },
    {
      id: "F40",
      screen: "wealth",
      title: "Liabilities",
      interaction:
        "Debt list with balance, APR, payment and automatic amortization status.",
      edge: "No debts gives a clear empty state; negative or invalid inputs fail beside fields.",
    },
    {
      id: "F41",
      screen: "wealth",
      title: "Liability editor",
      interaction:
        "Create/edit/delete name, kind, balance, APR, monthly payment and auto-amortize toggle.",
      edge: "Explain scheduled balance reduction and avoid counting the same payment twice.",
    },
    {
      id: "F42",
      screen: "holdings",
      title: "Holdings and allocation",
      interaction:
        "Account context, symbol/name, quantity, price, value, weight and asset class.",
      edge: "Null quantities/prices stay unavailable; show currencies without silently converting or summing unlike currencies.",
    },
    {
      id: "F43",
      screen: "holdings",
      title: "Investment freshness",
      interaction:
        "Import timestamp, missing account sets and portfolio connection status.",
      edge: "Incomplete history blocks computed return claims; labels distinguish market value from contributions.",
    },
    {
      id: "F44",
      screen: "debt",
      title: "Debt payoff scenarios",
      interaction:
        "Minimum-payment baseline, extra/month input, payoff dates, interest and saved months/interest.",
      edge: "Insufficient payments and negative amortization are explicit; scenario does not schedule a payment.",
    },
    {
      id: "F45",
      screen: "retirement",
      title: "Retirement assumptions",
      interaction:
        "Current age, retire-at age, annual bank saving, payroll retirement contribution including match, base return, upside/downside spreads.",
      edge: "Editable assumptions are estimates; show computed-return source and missing data fallback.",
    },
    {
      id: "F46",
      screen: "retirement",
      title: "Projection and save",
      interaction:
        "Maintain/upside/downside finals and age chart; inspect saving breakdown and explicitly save assumptions.",
      edge: "Separate bank saving from payroll retirement to prevent double counting; do not present forecasts as guarantees.",
    },
    {
      id: "F47",
      screen: "categories",
      title: "Categories",
      interaction:
        "Expense/income sections with name, color, usage and archived state.",
      edge: "Archived labels remain on historical transactions and can be restored.",
    },
    {
      id: "F48",
      screen: "categories",
      title: "Category editor",
      interaction:
        "Create with name/kind/color; rename/recolor; archive/restore; delete unused categories.",
      edge: "Used categories cannot be deleted; swatches have labels and 44px touch targets.",
    },
    {
      id: "F49",
      screen: "categories",
      title: "Tag management",
      interaction:
        "Create/rename/recolor, archive/restore/delete tags with usage and spending summary.",
      edge: "Deleting a tag explains removal of associations; transactions remain intact.",
    },
    {
      id: "F50",
      screen: "connections",
      title: "Bank provider",
      interaction:
        "Connection/import health and missing-source guidance; existing scheduled ingestion preserved.",
      edge: "Personal app currently lacks a full Plaid connection screen: this is a proposed provider-neutral UI, not an existing control.",
    },
    {
      id: "F51",
      screen: "connections",
      title: "Investment provider",
      interaction:
        "Connect/reconnect portal, status, last success/error and manual sync.",
      edge: "Single in-flight sync, stale values retained with date; no trade controls.",
    },
    {
      id: "F52",
      screen: "connections",
      title: "AI provider",
      interaction:
        "Configured/unavailable state and data-scope explanation; optional local provider in public app.",
      edge: "No API keys in client UI; conversations send only authorized context for the selected workspace.",
    },
    {
      id: "F53",
      screen: "chat",
      title: "Conversation library",
      interaction:
        "Saved conversations with title, updated time, search, pinned/archived filters and new conversation.",
      edge: "Owner-scoped server history in production; preview stores only local demo conversations.",
    },
    {
      id: "F54",
      screen: "chat",
      title: "Conversation thread",
      interaction:
        "User and assistant messages, date separators, current period, cited calculations and expandable query evidence.",
      edge: "History persists across close/relaunch; evidence records as-of time so old answers cannot appear current.",
    },
    {
      id: "F55",
      screen: "chat",
      title: "Send and recover",
      interaction:
        "Growing composer, send/stop-waiting, draft preservation, generating/complete/failed/interrupted states and retry.",
      edge: "Persist request ID before generation; reconnect reads the same job; do not issue a second paid request automatically.",
    },
    {
      id: "F56",
      screen: "chat",
      title: "Manage history",
      interaction:
        "Rename, pin, archive, restore and delete confirmation; retention setting and clear-history confirmation.",
      edge: "Server enforces ownership on every operation; deletion clears active records and defines backup retention separately.",
    },
    {
      id: "F57",
      screen: "chat",
      title: "Context controls",
      interaction:
        "Show included date range and filters; optional prior-message context with token budget and visible summary boundary.",
      edge: "Saved history is not unlimited model context; summaries and query evidence never bypass read-only access.",
    },
    {
      id: "F58",
      screen: "settings",
      title: "Theme and privacy",
      interaction:
        "System/light/dark, reduce-motion preference, hide amounts, workspace currency and sign out.",
      edge: "Respect system setting; currency is a workspace contract, not an unverified conversion switch.",
    },
    {
      id: "F59",
      screen: "settings",
      title: "Home-screen install",
      interaction:
        "iPhone Safari Share → Add to Home Screen → Open as Web App; Android install/menu help and already-installed state.",
      edge: "Require a reachable HTTPS deployment; desktop loopback cannot be used as the phone app URL.",
    },
    {
      id: "F60",
      screen: "settings",
      title: "Standalone navigation",
      interaction:
        "Own Back/Close controls, five stable tabs, preserved scroll/filter state and deep-link return after login.",
      edge: "No dependency on browser toolbar; Android Back closes sheet before leaving app, iOS has explicit Back.",
    },
    {
      id: "F61",
      screen: "settings",
      title: "Keyboard and safe areas",
      interaction:
        "Top/bottom/landscape insets, visual-viewport-aware chat, scrollable sheets and 16px fields.",
      edge: "No auto-focus on route entry; keep zoom enabled and prevent keyboard from covering Send.",
    },
    {
      id: "F62",
      screen: "settings",
      title: "Resume and offline",
      interaction:
        "On foreground revalidate auth and stale sources; show last verified state and retry.",
      edge: "Never auto-submit queued financial writes; no chat/financial API response caching in service worker.",
    },
    {
      id: "F63",
      screen: "settings",
      title: "Auth and workspace",
      interaction:
        "Sign-in, expired-session recovery, owner identity and sign out; keep private session boundary.",
      edge: "Re-auth before restoring sensitive server content; do not leak one workspace history into another.",
    },
    {
      id: "F64",
      screen: "settings",
      title: "Performance and access",
      interaction:
        "Route/chart lazy loading, bounded lists, stable skeletons, semantic controls and chart text alternatives.",
      edge: "Targets must be measured on physical devices; desktop viewport QA is not proof of phone performance.",
    },
    {
      id: "F65",
      screen: "wealth",
      title: "Snapshot recording",
      interaction:
        "Existing API-only manual snapshot operation stays in an advanced operator action with date and overwrite impact; daily snapshots remain scheduled.",
      edge: "Do not expose as a primary consumer button or record a snapshot just by viewing Wealth. This is an API-only capability, not a current on-screen feature.",
    },
    {
      id: "F66",
      screen: "activity",
      title: "Account breakdown and account lookup",
      interaction:
        "Existing account aggregate and account-list APIs support filter pickers and an optional account-detail breakdown with active date range.",
      edge: "The account aggregate endpoint has no current dedicated chart; do not invent a missing chart or change the existing reporting semantics.",
    },
  ],
  charts: [
    {
      id: "C01",
      screen: "home",
      title: "Income vs spending",
      kind: "line",
      labels: ["Income", "Spending"],
      values: [
        3900, 4200, 4300, 4500, 4100, 4600, 4200, 4700, 4400, 5100, 4900, 5200,
      ],
      compare: [
        2800, 3100, 3350, 3200, 3050, 3300, 3000, 3250, 3180, 3720, 3360, 3460,
      ],
      basis: "Monthly USD totals over 12 months",
      tap: "Month labels; solid emerald income, dashed rose spending; pin a month and open its transactions.",
      edge: "Show no history; no made-up points or interpolation across unavailable months.",
      dates: [
        "Oct",
        "Nov",
        "Dec",
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
      ],
    },
    {
      id: "C02",
      screen: "home",
      title: "Spending by category",
      kind: "donut",
      labels: ["Housing", "Groceries", "Dining", "Transport", "Other"],
      values: [1450, 248, 185, 92, 1485],
      compare: [],
      basis: "Effective spending by category in the selected period",
      tap: "Tap a legend row to select the slice; explicit View transactions; display amount and percentage.",
      edge: "Zero/negative total uses a text list; refunds cannot produce invalid slices.",
    },
    {
      id: "C03",
      screen: "home",
      title: "Top merchants",
      kind: "bar",
      labels: [
        "Example rent",
        "Corner Market",
        "Neighborhood Kitchen",
        "City Transit",
      ],
      values: [1450, 248, 185, 92],
      compare: [],
      basis: "USD spending per merchant in the selected period",
      tap: "Horizontal ranking with full merchant labels and value; tap opens exact filtered activity.",
      edge: "Long names wrap; fewer than eight merchants do not create empty bars.",
    },
    {
      id: "C04",
      screen: "forecast",
      title: "Cash flow · next 30 days",
      kind: "step",
      labels: ["Sep 11", "Sep 16", "Sep 21", "Sep 26", "Oct 1", "Oct 10"],
      values: [3250, 2770, 5010, 4210, 2410, 4650],
      compare: [],
      basis: "Projected USD balance by date, starting from a stated source",
      tap: "Step line, zero baseline, selected date/event list; switch typical spending estimate on/off.",
      edge: "No confirmed cash balance labels estimate; missing events prompts setup.",
    },
    {
      id: "C05",
      screen: "trends",
      title: "Daily spending calendar",
      kind: "heat",
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      values: [
        24, 85, 0, 140, 65, 40, 0, 33, 12, 80, 20, 0, 95, 44, 32, 24, 40, 0, 60,
        120, 10, 15, 60, 0, 200, 42, 10, 70,
      ],
      compare: [],
      basis: "Daily effective USD spend across six months",
      tap: "Phone presents one month with 44px day targets and next/previous month; six-month overview remains in expansion.",
      edge: "No hover-only tooltips; unknown dates differ from verified zero-spend dates.",
    },
    {
      id: "C06",
      screen: "trends",
      title: "Spending momentum",
      kind: "line",
      labels: ["30-day total", "90-day total"],
      values: [3100, 3250, 3390, 3280, 3420, 3460],
      compare: [8950, 9100, 9230, 9520, 9710, 10160],
      basis: "Rolling total spent in the previous 30 and 90 days",
      tap: "Solid/dashed lines, tap date readout and toggle each period; label total, not average or rate.",
      edge: "Require sufficient history for the full window; never imply the two totals use equal durations.",
    },
    {
      id: "C07",
      screen: "trends",
      title: "Year over year",
      kind: "bar",
      labels: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"],
      values: [3100, 3300, 3200, 3400, 3200, 3460],
      compare: [2800, 2900, 3100, 3200, 3300, 3050],
      basis: "Monthly USD spend grouped by year",
      tap: "Paired bars for selected years; full month/year names in readout and table.",
      edge: "Flag partial current month; missing year/month is unavailable, not zero.",
    },
    {
      id: "C08",
      screen: "budgets",
      title: "Budget vs actual",
      kind: "bar",
      labels: ["Housing", "Groceries", "Dining", "Transport"],
      values: [1450, 248, 185, 92],
      compare: [1600, 450, 300, 180],
      basis:
        "USD actual versus target; projected month-end disclosed separately",
      tap: "Actual/target bars with pace marker and explicit amount over target; tap to edit or view activity.",
      edge: "Unset and zero targets are distinct; do not mask overspend by only capping the bar.",
    },
    {
      id: "C09",
      screen: "wealth",
      title: "Net worth over time",
      kind: "line",
      labels: ["Total net worth", "Current net worth"],
      values: [28000, 30200, 32300, 35100, 37000, 39250],
      compare: [7900, 8800, 9400, 10000, 10300, 10650],
      basis: "USD recorded snapshots by date",
      tap: "Two labeled solid/dashed series, selected date and breakdown; retirement separation remains visible.",
      edge: "Missing snapshot/source remains missing; current net worth is not spendable cash.",
    },
    {
      id: "C10",
      screen: "holdings",
      title: "Asset allocation",
      kind: "donut",
      labels: ["Equity", "Bonds", "Cash", "Other"],
      values: [6800, 3100, 1500, 1000],
      compare: [],
      basis: "Market value and weight by asset-class bucket",
      tap: "Tap legend to filter holdings; show amounts, weights, source currency and as-of date.",
      edge: "No cross-currency sum or allocation based on an incomplete set without clear scope.",
    },
    {
      id: "C11",
      screen: "debt",
      title: "Debt payoff",
      kind: "line",
      labels: ["Minimum payments", "With extra payment"],
      values: [10500, 8500, 7000, 5500, 4000, 2400],
      compare: [10500, 7900, 5800, 3700, 1500, 0],
      basis: "Remaining principal by month under two payment scenarios",
      tap: "Baseline and accelerated line with extra/month input; compare payoff date and total interest.",
      edge: "No payoff for insufficient payment; zero debt empty success; scenario never creates a payment.",
    },
    {
      id: "C12",
      screen: "retirement",
      title: "Retirement projection",
      kind: "line",
      labels: ["Maintain", "Surpass", "Underperform"],
      values: [28600, 55000, 101000, 175000, 298000, 480000],
      compare: [28600, 61000, 128000, 249000, 459000, 820000],
      basis:
        "Projected portfolio USD by age under three explicit return assumptions",
      tap: "Three labeled differentiated lines, age selection, final outcomes and assumption editor.",
      edge: "Estimates not promises; missing current age/balance is a prerequisite; payroll and bank savings separate.",
    },
  ],
};
