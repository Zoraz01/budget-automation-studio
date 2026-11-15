# Daily overview

Direction A selected and implemented in source on 2026-11-14. This is the Home implementation of the selected concept. The wider navigation and other screen designs in [the platform proposal](design/PLATFORM-OVERHAUL.md) remain separate planned work. Existing navigation and financial workflows remain available.

## What changed

Home now starts with compact cash-flow, spending and income measures. A transaction review card sits beside the monthly budget on desktop. Cash planning and Goals appear before recent activity and category details. Investment accounts retain their own labels, currency, observation date and stale/unavailable state. On a phone the first measure spans the screen and the next two sit side by side, followed by review, budget and planning.

Start review opens Activity with Needs review selected. It includes posted, unreviewed records, clears an old search from the new review journey, and leaves pending authorizations outside this queue. Category confirmation remains an explicit action. All activity returns to the complete list; an empty Home review card opens that complete view.

Goals shows reserved cash, planned monthly contributions and purchase payment holds from a read-only summary. Returning Home reloads local state so completed Goals actions appear in that summary. The summary response contains only those three aggregate amounts; it does not expose goal names, notes, settings or audit entries and does not mutate the ledger.

The existing cash-plan form remains a read-only preview. Its balance observation, bills, reserves, buffer, daily spending and confirmed-income controls are retained. Home does not infer a bank balance from cash flow. Model requests, provider refreshes and financial edits are not triggered by opening Home.

## Financial definitions and scope

- BAS net cash flow remains recorded income minus spending after refunds. Transfers, pending authorizations and removed transactions remain excluded according to the existing calculation. Goals reservations do not create expenses or reduce this total again.
- Budget remaining compares the full-month target with the month's spending. Spending in categories with no allocated budget still counts in BAS. Negative remaining amounts are labeled over budget. This figure is not available cash.
- Goals amounts are virtual allocations of existing cash. Purchase payment holds remain visible until explicit settlement. A planned contribution is not additional income or a bank transfer.
- Investment account values are listed individually. Missing values remain unavailable; last-known values can be stale. Foreign currency is labeled rather than combined or converted. This is not a new combined net-worth calculation.

The personal companion has observed checking, its own liquid-cash-flow bridge, targeted-category budget totals and advanced wealth/forecast capabilities. BAS adapts the daily-overview structure with its supported income metric, manual cash plan and account values. Connected cash observations, advanced wealth, recurring detection and external expense sharing remain explicit gaps. This change does not claim that those gaps are synchronized.

## Setup and validation

No new environment variable, provider key, database migration or runtime dependency is required. The public app serves the new `home.css` through its static-file allowlist. Continue using [the setup guide](SETUP.md) and the adopter's own credentials. The security boundary remains loopback-only.

```sh
npm test
npm run check:format
npm run check:release
# Optional, with Playwright installed separately:
node test/browser-acceptance.mjs
```

If Playwright is outside the repository, set `PLAYWRIGHT_MODULE` to its module entry. [The design validation guide](design/PLATFORM-VALIDATION.md) describes a separate temporary installation. The browser test uses an in-memory synthetic store and explicit demo configuration; it starts and closes its own browser/server. It does not load a personal environment file. Do not use screenshots from an adopter's financial workspace for public documentation.

Validation: 99 public regression tests pass. The new HTTP test checks exact goal-summary amounts, absence of notes, unchanged cash-flow totals and no database writes on the summary read. Browser checks cover review filtering and explicit confirmation, search reset, empty review, manual cash planning, stale response/auth/logout recovery and 20 page/viewport combinations at 320, 390, 768 and 1280px. Reconciled synthetic before/after captures were also checked at 390 and 1440px. Formatting, release-content, credential/Gitleaks scanning and manual public source/image review apply to publication.

The existing `follow-redirects` advisory recorded in [the design validation](design/PLATFORM-VALIDATION.md) remains open; no dependency or provider transport change is included here. Source publication is not a hosted runtime deployment. Real phone installation, software-keyboard behavior and physical-device acceptance remain separate.

## Preview and rollback

See the [desktop before/after](design/daily-overview-desktop.html) and [phone before/after](design/daily-overview-mobile.html). These boards contain actual synthetic browser captures of the previous and new source, not redrawn mockups. The original A/B/C study remains available for design history.

For an adopter rollback, restore the previously validated application version through the existing deployment process. No financial database rollback is needed for this presentation change; preserve current records and encryption keys. The separate goal-summary API is additive, and the UI has a non-numeric fallback when that field is absent on an older server.
