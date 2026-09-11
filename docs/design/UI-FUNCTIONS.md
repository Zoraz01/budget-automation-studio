# Feature-by-feature UI contracts

66 contracts. Existing behavior is preserved unless a row explicitly proposes a new UI or requirement. All amounts and identities in the preview are invented.

New scope includes durable conversations (F53–F57), expanded connection settings (F50/F52), and standalone lifecycle/performance improvements (F58–F64). F65–F66 identify API-only capabilities rather than claiming an existing visible UI.

## F01 · Period controls

Destination: **{f["screen"]}**.

Controls and behavior: Month / 3M / 6M / 12M / YTD / all-time plus custom dates; keep selections on back navigation.

Semantics and recovery: All-time hides misleading prior-window comparisons; invalid ranges stay inline.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F02 · Cash-flow summary

Destination: **{f["screen"]}**.

Controls and behavior: Liquid cash flow, income, spending and savings rate; tap a number for the exact definition and contributing transactions.

Semantics and recovery: Separate period movement from current balances; unavailable savings rate is a dash, never zero.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F03 · Savings breakdown

Destination: **{f["screen"]}**.

Controls and behavior: Show accessible savings contributions/withdrawals, retirement contributions and unmatched destinations in a disclosure.

Semantics and recovery: Unmatched transfers remain unresolved; do not guess the destination or count withdrawals as earned income.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F04 · Spending insights

Destination: **{f["screen"]}**.

Controls and behavior: Rank increased and decreased categories; show current, previous, dollar change and period.

Semantics and recovery: Tap to filtered Activity; absent prior data says no comparison.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F05 · Source freshness

Destination: **{f["screen"]}**.

Controls and behavior: Per-provider as-of time, partial data and reconnect state in a status sheet.

Semantics and recovery: Missing is unavailable; stale data keeps its date; refresh does not imply a paid institution refresh.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F06 · 30-day outlook

Destination: **{f["screen"]}**.

Controls and behavior: Starting cash, source, lowest balance/date, recurring income and bill agenda; day selection opens its events.

Semantics and recovery: Flow-derived starting cash is explicitly estimated; no events produces a setup message, not a disappearing card.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F07 · Typical spending toggle

Destination: **{f["screen"]}**.

Controls and behavior: Switch baseline daily spending on/off while keeping the same future events.

Semantics and recovery: Show daily estimate and assumptions; this scenario is not a payment instruction.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F08 · Next paycheck

Destination: **{f["screen"]}**.

Controls and behavior: Amount/date, cycle length, before/after paycheck cash, must-pay bills and flexible subscriptions.

Semantics and recovery: Missing payroll or balance keeps the module visible with the missing prerequisite.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F09 · Savings scenarios

Destination: **{f["screen"]}**.

Controls and behavior: Buffer-floor input, possible saving amounts, investment pace, money/day and cash remaining.

Semantics and recovery: Upper saving bound assumes zero everyday spending; label it as a bound, not a recommendation.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F10 · Review queue

Destination: **{f["screen"]}**.

Controls and behavior: Count, grouped purchase identity, AI-suggestion badge and focused purchase card with next/previous controls.

Semantics and recovery: Empty inbox is success; provider-pending charges remain distinguishable from posted items awaiting review.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F11 · Edit review purchase

Destination: **{f["screen"]}**.

Controls and behavior: Description, amount, category, account and transfer classification before approval; date shown with details.

Semantics and recovery: Save failures preserve the draft; posted or uncertain shared expenses block incompatible edits.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F12 · Approve purchase

Destination: **{f["screen"]}**.

Controls and behavior: Preview final category and amount, then approve and learn the merchant rule.

Semantics and recovery: Disable duplicate submission; success advances queue and updates count; failures keep the card.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F13 · Bulk approval

Destination: **{f["screen"]}**.

Controls and behavior: List eligible and skipped purchases before confirmation.

Semantics and recovery: Unfinished shared expenses stay in Review; report approved and skipped counts separately.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F14 · Reject purchase

Destination: **{f["screen"]}**.

Controls and behavior: Confirm exclusion and explain permanent import suppression for that source identity.

Semantics and recovery: Cannot discard posted or uncertain shared-expense activity; surface the repair path.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F15 · Category split

Destination: **{f["screen"]}**.

Controls and behavior: Add/remove parts with category and decimal amount; sticky total and cents remaining; at least two parts.

Semantics and recovery: Exact conservation in integer cents; return validation beside the offending part.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F16 · Refund suggestion

Destination: **{f["screen"]}**.

Controls and behavior: Show suggested original date, merchant and amount; link only on explicit tap.

Semantics and recovery: Multiple candidates require choice; linking changes net spending rather than creating income.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F17 · Expense-sharing connection

Destination: **{f["screen"]}**.

Controls and behavior: Connect with OAuth, scope explanation, cancel/denied/expired callback, reconnect and disconnect.

Semantics and recovery: Keep tokens server-side; return to the exact purchase after auth; uncertain commit blocks disconnect.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F18 · People and trip selection

Destination: **{f["screen"]}**.

Controls and behavior: Search private contacts, include payer, choose optional trip, equal or exact split.

Semantics and recovery: Do not expose contact names in public fixtures; duplicate/missing participants fail inline.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F19 · Prepare split

Destination: **{f["screen"]}**.

Controls and behavior: Normalized shares, payer, total and receivable preview with expiry.

Semantics and recovery: Preparation creates no posted expense; changed purchase or selection invalidates prior preview.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F20 · Post and approve

Destination: **{f["screen"]}**.

Controls and behavior: Explicit action commits the prepared action then finalizes local approval.

Semantics and recovery: Show posting and posted states; retry the same action after a dropped connection, never recreate it.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F21 · Reconcile or abandon

Destination: **{f["screen"]}**.

Controls and behavior: Check uncertain status, expired preview, changed transaction, failed provider response and approve-without-sharing path.

Semantics and recovery: Uncertain or posted actions cannot be abandoned; a timeout is not proof of failure.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F22 · Search and filters

Destination: **{f["screen"]}**.

Controls and behavior: Search description/notes; direction, account, category, tag, from/to; apply/reset sheet and active chips.

Semantics and recovery: Preserve filter state and list position when returning from a transaction or chart.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F23 · Transaction list and totals

Destination: **{f["screen"]}**.

Controls and behavior: Date groups, amount/direction, category, source, notes, review/reward/transfer/refund/attachment/share badges; filtered totals.

Semantics and recovery: Large datasets use bounded pages, visible result count and next/previous or load-more controls.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F24 · Create/edit transaction

Destination: **{f["screen"]}**.

Controls and behavior: Date, direction, description, amount, category, account, notes, tags and own-account transfer checkbox.

Semantics and recovery: Validate required fields and decimal cents; keep failed edits; do not rewrite posted shared activity.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F25 · Delete transaction

Destination: **{f["screen"]}**.

Controls and behavior: Impact sheet explains linked files and history before confirmation.

Semantics and recovery: Block committed/uncertain shared expenses; keep failure visible instead of removing the row optimistically.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F26 · Refund linking

Destination: **{f["screen"]}**.

Controls and behavior: Candidate originals with date, amount and exact-match marker; link, inspect cumulative refunds, unlink.

Semantics and recovery: No candidates says why; over-refund and incompatible direction require validation.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F27 · Receipt attachments

Destination: **{f["screen"]}**.

Controls and behavior: Existing file list, image/PDF picker, progress, view/download and delete confirmation; show 15 MB limit.

Semantics and recovery: Files require authenticated requests; no public URLs or offline caching; camera is optional progressive enhancement.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F28 · Transaction tags

Destination: **{f["screen"]}**.

Controls and behavior: Choose multiple tags, create one inline, preserve selected archived tags, save alongside transaction.

Semantics and recovery: Tag failure must not silently look like full transaction success; allow retry of unfinished save.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F29 · Trend explorer

Destination: **{f["screen"]}**.

Controls and behavior: Daily calendar, rolling 30/90-day totals and year comparisons with selected-date readouts.

Semantics and recovery: Comparisons use equal periods and literal aggregate definitions, not misleading normalized labels.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F30 · Recurring summary

Destination: **{f["screen"]}**.

Controls and behavior: Must-pay, flexible and total monthly equivalents with active count.

Semantics and recovery: Explain cadence conversion and estimates; zero items prompts history import rather than fabricated bills.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F31 · Recurring rule editing

Destination: **{f["screen"]}**.

Controls and behavior: Each merchant shows cadence, average, next expected, monthly equivalent; set must-pay/flexible/hidden and restore hidden.

Semantics and recovery: Hidden items excluded from recurring totals, forecast and paycheck planning; failure rolls back classification.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F32 · Monthly budget overview

Destination: **{f["screen"]}**.

Controls and behavior: Month, day elapsed, target, actual and remaining; distinguish unbudgeted spend.

Semantics and recovery: No targets and zero targets are distinct; linked refunds reduce effective spending.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F33 · Target editor

Destination: **{f["screen"]}**.

Controls and behavior: Tap category to edit/set/remove monthly target with explicit Save/Cancel; decimal keypad.

Semantics and recovery: Replace blur autosave with clear save feedback; validate nonnegative values and preserve failed drafts.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F34 · Budget pace

Destination: **{f["screen"]}**.

Controls and behavior: Actual versus target, projected month-end spend and pace warning in text and bar.

Semantics and recovery: Do not extrapolate a future month or hide overspend behind a capped bar; show excess as a number.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F35 · Unusual purchases

Destination: **{f["screen"]}**.

Controls and behavior: Category average, purchase amount and deviation measure next to each flagged row.

Semantics and recovery: An outlier is not fraud; show metric definition and insufficient-sample state.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F36 · Largest purchases

Destination: **{f["screen"]}**.

Controls and behavior: Top purchases over 90 days, account/category and average-transaction summary.

Semantics and recovery: Open the exact purchase rather than a broad merchant search; empty ranges remain visible.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F37 · Net-worth summary

Destination: **{f["screen"]}**.

Controls and behavior: Total net worth, current net worth and liabilities; breakdown distinguishes cash, accessible investments and retirement.

Semantics and recovery: Current net worth definition stays consistent with backend; absent source balance is never zero.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F38 · Accounts

Destination: **{f["screen"]}**.

Controls and behavior: List manual and linked assets with name, kind, amount, retirement flag and source date.

Semantics and recovery: Provider-owned balances show provenance; edit/delete rules must not disguise imported versus manual values.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F39 · Account editor

Destination: **{f["screen"]}**.

Controls and behavior: Name, kind, balance and retirement classification; create, edit and delete confirmation.

Semantics and recovery: Retirement kind implies retirement flag; preserve manual assets when connections change.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F40 · Liabilities

Destination: **{f["screen"]}**.

Controls and behavior: Debt list with balance, APR, payment and automatic amortization status.

Semantics and recovery: No debts gives a clear empty state; negative or invalid inputs fail beside fields.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F41 · Liability editor

Destination: **{f["screen"]}**.

Controls and behavior: Create/edit/delete name, kind, balance, APR, monthly payment and auto-amortize toggle.

Semantics and recovery: Explain scheduled balance reduction and avoid counting the same payment twice.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F42 · Holdings and allocation

Destination: **{f["screen"]}**.

Controls and behavior: Account context, symbol/name, quantity, price, value, weight and asset class.

Semantics and recovery: Null quantities/prices stay unavailable; show currencies without silently converting or summing unlike currencies.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F43 · Investment freshness

Destination: **{f["screen"]}**.

Controls and behavior: Import timestamp, missing account sets and portfolio connection status.

Semantics and recovery: Incomplete history blocks computed return claims; labels distinguish market value from contributions.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F44 · Debt payoff scenarios

Destination: **{f["screen"]}**.

Controls and behavior: Minimum-payment baseline, extra/month input, payoff dates, interest and saved months/interest.

Semantics and recovery: Insufficient payments and negative amortization are explicit; scenario does not schedule a payment.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F45 · Retirement assumptions

Destination: **{f["screen"]}**.

Controls and behavior: Current age, retire-at age, annual bank saving, payroll retirement contribution including match, base return, upside/downside spreads.

Semantics and recovery: Editable assumptions are estimates; show computed-return source and missing data fallback.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F46 · Projection and save

Destination: **{f["screen"]}**.

Controls and behavior: Maintain/upside/downside finals and age chart; inspect saving breakdown and explicitly save assumptions.

Semantics and recovery: Separate bank saving from payroll retirement to prevent double counting; do not present forecasts as guarantees.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F47 · Categories

Destination: **{f["screen"]}**.

Controls and behavior: Expense/income sections with name, color, usage and archived state.

Semantics and recovery: Archived labels remain on historical transactions and can be restored.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F48 · Category editor

Destination: **{f["screen"]}**.

Controls and behavior: Create with name/kind/color; rename/recolor; archive/restore; delete unused categories.

Semantics and recovery: Used categories cannot be deleted; swatches have labels and 44px touch targets.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F49 · Tag management

Destination: **{f["screen"]}**.

Controls and behavior: Create/rename/recolor, archive/restore/delete tags with usage and spending summary.

Semantics and recovery: Deleting a tag explains removal of associations; transactions remain intact.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F50 · Bank provider

Destination: **{f["screen"]}**.

Controls and behavior: Connection/import health and missing-source guidance; existing scheduled ingestion preserved.

Semantics and recovery: Personal app currently lacks a full Plaid connection screen: this is a proposed provider-neutral UI, not an existing control.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F51 · Investment provider

Destination: **{f["screen"]}**.

Controls and behavior: Connect/reconnect portal, status, last success/error and manual sync.

Semantics and recovery: Single in-flight sync, stale values retained with date; no trade controls.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F52 · AI provider

Destination: **{f["screen"]}**.

Controls and behavior: Configured/unavailable state and data-scope explanation; optional local provider in public app.

Semantics and recovery: No API keys in client UI; conversations send only authorized context for the selected workspace.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F53 · Conversation library

Destination: **{f["screen"]}**.

Controls and behavior: Saved conversations with title, updated time, search, pinned/archived filters and new conversation.

Semantics and recovery: Owner-scoped server history in production; preview stores only local demo conversations.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F54 · Conversation thread

Destination: **{f["screen"]}**.

Controls and behavior: User and assistant messages, date separators, current period, cited calculations and expandable query evidence.

Semantics and recovery: History persists across close/relaunch; evidence records as-of time so old answers cannot appear current.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F55 · Send and recover

Destination: **{f["screen"]}**.

Controls and behavior: Growing composer, send/stop-waiting, draft preservation, generating/complete/failed/interrupted states and retry.

Semantics and recovery: Persist request ID before generation; reconnect reads the same job; do not issue a second paid request automatically.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F56 · Manage history

Destination: **{f["screen"]}**.

Controls and behavior: Rename, pin, archive, restore and delete confirmation; retention setting and clear-history confirmation.

Semantics and recovery: Server enforces ownership on every operation; deletion clears active records and defines backup retention separately.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F57 · Context controls

Destination: **{f["screen"]}**.

Controls and behavior: Show included date range and filters; optional prior-message context with token budget and visible summary boundary.

Semantics and recovery: Saved history is not unlimited model context; summaries and query evidence never bypass read-only access.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F58 · Theme and privacy

Destination: **{f["screen"]}**.

Controls and behavior: System/light/dark, reduce-motion preference, hide amounts, workspace currency and sign out.

Semantics and recovery: Respect system setting; currency is a workspace contract, not an unverified conversion switch.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F59 · Home-screen install

Destination: **{f["screen"]}**.

Controls and behavior: iPhone Safari Share → Add to Home Screen → Open as Web App; Android install/menu help and already-installed state.

Semantics and recovery: Require a reachable HTTPS deployment; desktop loopback cannot be used as the phone app URL.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F60 · Standalone navigation

Destination: **{f["screen"]}**.

Controls and behavior: Own Back/Close controls, five stable tabs, preserved scroll/filter state and deep-link return after login.

Semantics and recovery: No dependency on browser toolbar; Android Back closes sheet before leaving app, iOS has explicit Back.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F61 · Keyboard and safe areas

Destination: **{f["screen"]}**.

Controls and behavior: Top/bottom/landscape insets, visual-viewport-aware chat, scrollable sheets and 16px fields.

Semantics and recovery: No auto-focus on route entry; keep zoom enabled and prevent keyboard from covering Send.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F62 · Resume and offline

Destination: **{f["screen"]}**.

Controls and behavior: On foreground revalidate auth and stale sources; show last verified state and retry.

Semantics and recovery: Never auto-submit queued financial writes; no chat/financial API response caching in service worker.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F63 · Auth and workspace

Destination: **{f["screen"]}**.

Controls and behavior: Sign-in, expired-session recovery, owner identity and sign out; keep private session boundary.

Semantics and recovery: Re-auth before restoring sensitive server content; do not leak one workspace history into another.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F64 · Performance and access

Destination: **{f["screen"]}**.

Controls and behavior: Route/chart lazy loading, bounded lists, stable skeletons, semantic controls and chart text alternatives.

Semantics and recovery: Targets must be measured on physical devices; desktop viewport QA is not proof of phone performance.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F65 · Snapshot recording

Destination: **{f["screen"]}**.

Controls and behavior: Existing API-only manual snapshot operation stays in an advanced operator action with date and overwrite impact; daily snapshots remain scheduled.

Semantics and recovery: Do not expose as a primary consumer button or record a snapshot just by viewing Wealth. This is an API-only capability, not a current on-screen feature.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.

## F66 · Account breakdown and account lookup

Destination: **{f["screen"]}**.

Controls and behavior: Existing account aggregate and account-list APIs support filter pickers and an optional account-detail breakdown with active date range.

Semantics and recovery: The account aggregate endpoint has no current dedicated chart; do not invent a missing chart or change the existing reporting semantics.

Acceptance: test normal, empty, loading, failed and stale inputs as applicable; preserve keyboard focus/drafts; use labeled 44px controls; validate the actual server response before success; pair the generic public implementation.
