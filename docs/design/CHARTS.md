# Chart and visualization specification

Twelve existing visualizations are retained. The spending calendar and budget progress bars count as visualizations even though they are not Recharts components. Source snapshots and backend calculations remain authoritative; prototype arrays are invented.

## Common chart behavior

- Card width follows the viewport. Reserve approximately 200–240px for trend plots, then allow an expanded view. No page-level horizontal scrolling.
- A visible exact-value readout remains after tapping. Provide keyboard-operable date/category controls and a semantic data table; hover is optional.
- Legend text and solid/dashed line patterns supplement color. Do not make red/green the only distinction. Show currency, period, basis and source timestamp.
- For dense timelines, decimate the drawing while exact readouts use the full-resolution source. Lazy-load below-fold chart code; suppress entrance animation for reduced motion.
- Empty, insufficient history, partial/stale source sets and failed fetch are different states. Never fabricate a zero, carry forward an unavailable balance without disclosure, or invent intermediate financial observations.
- Chart drilldowns carry exact date/category/account identity and return to the same chart selection and scroll position. Projection charts open assumptions/events, not fake transaction drilldowns.

## C01 · Income vs spending

Screen: **home**. Type: **line**.

Data/units: Monthly USD totals over 12 months.

Series / categories: Income, Spending.

Touch and drilldown: Month labels; solid emerald income, dashed rose spending; pin a month and open its transactions.

Edge states: Show no history; no made-up points or interpolation across unavailable months.

Acceptance: validate exact values against the underlying API fixture; exercise touch and keyboard selection; verify empty/error/stale states, no clipped labels at 360px, table parity, 200% text, and no information available only on hover.

## C02 · Spending by category

Screen: **home**. Type: **donut**.

Data/units: Effective spending by category in the selected period.

Series / categories: Housing, Groceries, Dining, Transport, Other.

Touch and drilldown: Tap a legend row to select the slice; explicit View transactions; display amount and percentage.

Edge states: Zero/negative total uses a text list; refunds cannot produce invalid slices.

Acceptance: validate exact values against the underlying API fixture; exercise touch and keyboard selection; verify empty/error/stale states, no clipped labels at 360px, table parity, 200% text, and no information available only on hover.

## C03 · Top merchants

Screen: **home**. Type: **bar**.

Data/units: USD spending per merchant in the selected period.

Series / categories: Example rent, Corner Market, Neighborhood Kitchen, City Transit.

Touch and drilldown: Horizontal ranking with full merchant labels and value; tap opens exact filtered activity.

Edge states: Long names wrap; fewer than eight merchants do not create empty bars.

Acceptance: validate exact values against the underlying API fixture; exercise touch and keyboard selection; verify empty/error/stale states, no clipped labels at 360px, table parity, 200% text, and no information available only on hover.

## C04 · Cash flow · next 30 days

Screen: **forecast**. Type: **step**.

Data/units: Projected USD balance by date, starting from a stated source.

Series / categories: Sep 11, Sep 16, Sep 21, Sep 26, Oct 1, Oct 10.

Touch and drilldown: Step line, zero baseline, selected date/event list; switch typical spending estimate on/off.

Edge states: No confirmed cash balance labels estimate; missing events prompts setup.

Acceptance: validate exact values against the underlying API fixture; exercise touch and keyboard selection; verify empty/error/stale states, no clipped labels at 360px, table parity, 200% text, and no information available only on hover.

## C05 · Daily spending calendar

Screen: **trends**. Type: **heat**.

Data/units: Daily effective USD spend across six months.

Series / categories: Week 1, Week 2, Week 3, Week 4.

Touch and drilldown: Phone presents one month with 44px day targets and next/previous month; six-month overview remains in expansion.

Edge states: No hover-only tooltips; unknown dates differ from verified zero-spend dates.

Acceptance: validate exact values against the underlying API fixture; exercise touch and keyboard selection; verify empty/error/stale states, no clipped labels at 360px, table parity, 200% text, and no information available only on hover.

## C06 · Spending momentum

Screen: **trends**. Type: **line**.

Data/units: Rolling total spent in the previous 30 and 90 days.

Series / categories: 30-day total, 90-day total.

Touch and drilldown: Solid/dashed lines, tap date readout and toggle each period; label total, not average or rate.

Edge states: Require sufficient history for the full window; never imply the two totals use equal durations.

Acceptance: validate exact values against the underlying API fixture; exercise touch and keyboard selection; verify empty/error/stale states, no clipped labels at 360px, table parity, 200% text, and no information available only on hover.

## C07 · Year over year

Screen: **trends**. Type: **bar**.

Data/units: Monthly USD spend grouped by year.

Series / categories: Apr, May, Jun, Jul, Aug, Sep.

Touch and drilldown: Paired bars for selected years; full month/year names in readout and table.

Edge states: Flag partial current month; missing year/month is unavailable, not zero.

Acceptance: validate exact values against the underlying API fixture; exercise touch and keyboard selection; verify empty/error/stale states, no clipped labels at 360px, table parity, 200% text, and no information available only on hover.

## C08 · Budget vs actual

Screen: **budgets**. Type: **bar**.

Data/units: USD actual versus target; projected month-end disclosed separately.

Series / categories: Housing, Groceries, Dining, Transport.

Touch and drilldown: Actual/target bars with pace marker and explicit amount over target; tap to edit or view activity.

Edge states: Unset and zero targets are distinct; do not mask overspend by only capping the bar.

Acceptance: validate exact values against the underlying API fixture; exercise touch and keyboard selection; verify empty/error/stale states, no clipped labels at 360px, table parity, 200% text, and no information available only on hover.

## C09 · Net worth over time

Screen: **wealth**. Type: **line**.

Data/units: USD recorded snapshots by date.

Series / categories: Total net worth, Current net worth.

Touch and drilldown: Two labeled solid/dashed series, selected date and breakdown; retirement separation remains visible.

Edge states: Missing snapshot/source remains missing; current net worth is not spendable cash.

Acceptance: validate exact values against the underlying API fixture; exercise touch and keyboard selection; verify empty/error/stale states, no clipped labels at 360px, table parity, 200% text, and no information available only on hover.

## C10 · Asset allocation

Screen: **holdings**. Type: **donut**.

Data/units: Market value and weight by asset-class bucket.

Series / categories: Equity, Bonds, Cash, Other.

Touch and drilldown: Tap legend to filter holdings; show amounts, weights, source currency and as-of date.

Edge states: No cross-currency sum or allocation based on an incomplete set without clear scope.

Acceptance: validate exact values against the underlying API fixture; exercise touch and keyboard selection; verify empty/error/stale states, no clipped labels at 360px, table parity, 200% text, and no information available only on hover.

## C11 · Debt payoff

Screen: **debt**. Type: **line**.

Data/units: Remaining principal by month under two payment scenarios.

Series / categories: Minimum payments, With extra payment.

Touch and drilldown: Baseline and accelerated line with extra/month input; compare payoff date and total interest.

Edge states: No payoff for insufficient payment; zero debt empty success; scenario never creates a payment.

Acceptance: validate exact values against the underlying API fixture; exercise touch and keyboard selection; verify empty/error/stale states, no clipped labels at 360px, table parity, 200% text, and no information available only on hover.

## C12 · Retirement projection

Screen: **retirement**. Type: **line**.

Data/units: Projected portfolio USD by age under three explicit return assumptions.

Series / categories: Maintain, Surpass, Underperform.

Touch and drilldown: Three labeled differentiated lines, age selection, final outcomes and assumption editor.

Edge states: Estimates not promises; missing current age/balance is a prerequisite; payroll and bank savings separate.

Acceptance: validate exact values against the underlying API fixture; exercise touch and keyboard selection; verify empty/error/stale states, no clipped labels at 360px, table parity, 200% text, and no information available only on hover.
