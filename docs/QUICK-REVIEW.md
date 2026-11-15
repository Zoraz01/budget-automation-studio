# Quick Review

The approved Review design is implemented in source. Open Activity's **Needs review** view, or use **Start review** on Home. One selected posted purchase shows its date, description, exact amount, category and source. **Approve** confirms it and advances after the server responds. Other purchases and queue search sit under Up next on a phone, beside it on desktop. Success feedback stays in the heading so it does not cover the next action.

**Edit** opens description, date, signed amount and category. Close/Escape cancels the draft. **Save changes** saves it while leaving approval required; **Save & approve** explicitly commits both decisions. Save failures keep the entered draft. In-flight actions block repeated submission. After a failed approval, refresh status before retrying; failed reads do not re-enable an uncertain action. Search retains keyboard focus, and a filtered empty result says No matches rather than All reviewed.

Choosing an unreviewed category in All activity now saves it without approving the record. The separate Approve button remains explicit. Pending bank authorizations stay outside Review and cannot be approved through either the new route or the legacy category confirmation route.

## Financial and API contract

`PATCH /api/transactions/review` requires the authenticated session and same-origin JSON request used by the rest of the application. The body is `{id, approve, expected, edits?}`. `approve` must be a boolean. The required `expected` snapshot has `date`, `description`, `amount_cents`, `category_id`, `pending` and `reviewed`, taken from the displayed state response. Edits allow only `description`, `date`, decimal-string `amount` and `category_id`.

The server compares the snapshot and updates the record in one SQLite transaction. Changed, pending, removed or already reviewed records return a conflict; invalid edits roll back without partial changes. A save leaves `reviewed=0`; approval sets it to 1. The response contains the updated transaction's public state fields, not connection credentials or identifiers.

Amounts keep BAS's existing sign convention: positive is money out, negative is money in. An expense-category negative amount is a refund; Transfers remain excluded from income and spending. Review does not change source identity or currency, infer account balances, execute bank transfers, or link refunds. A later provider update can still return changed activity to Review according to the existing ingestion rules; this change does not add permanent overrides of provider facts.

BAS has no account-selection data or advanced category-split, refund-original, shared-expense, bulk-review or ignore-ledger adapter. Those existing gaps remain open in [feature parity](FEATURE-PARITY.md). The read-only summary uses Source rather than inventing a bank account. No unsupported advanced action is shown.

## Setup and validation

Continue using [SETUP.md](SETUP.md). No new environment variable, provider key, schema migration or runtime dependency is required. The existing server now allowlists `review.js` and `review.css`; the normal start command serves them. The security boundary remains loopback-only. Source publication does not deploy a hosted instance or establish physical-phone acceptance. Adding the app to a phone requires a reachable HTTPS deployment, as described in the existing mobile setup guidance.

```sh
npm test
npm run check:format
npm run check:release
# Optional, with Playwright installed separately or PLAYWRIGHT_MODULE set:
node test/browser-quick-review.mjs
node test/browser-acceptance.mjs
```

The new browser harness uses explicit demo configuration and a separate in-memory database, blocks off-origin requests and closes its browser/server/database in `finally`. `BAS_TEST_OUTPUT` redirects screenshots; the default is a temporary directory. No adopter environment is loaded. The subsequent release patch updates only `follow-redirects` to 1.16.3; the production dependency audit passes. No other dependency version changes.

Validation: 102 tests, including snapshot conflicts, auth/origin, exact cents, pending/removed records, rollback and refund/transfer semantics. Both browser suites pass, including editor cancel/save/approve, duplicate-click guard, retained failed drafts, status recovery, typed queue search and category changes that remain unapproved. The new view was checked at 320/390/768/1280 pixels, with Approve above the phone navigation before and after advancing. The existing suite checks 20 page/viewport combinations plus auth and stale-response recovery. Formatting, exact screenshot allowlist, release-content checks, secret scanning and manual public source/image review accompany the separate source publication.

Actual [phone](design/quick-review-runtime-mobile.jpg) and [desktop](design/quick-review-runtime-desktop.jpg) captures use only this repository's invented demo. The earlier [prototype](design/quick-review.html) remains design history. The personal companion implements the same daily Review intent with its own APIs and richer account/sharing capabilities; no private data, deployment files or Git history are included here.
