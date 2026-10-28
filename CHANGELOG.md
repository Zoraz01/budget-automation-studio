# Changelog

## 2026-10-12 — Reliable period selection and provider evidence

- Cancel outdated reads, hide totals while a different month loads, and show explicit failure/retry states.
- Prevent old authorization errors or delayed state reads from disrupting a newer view or completed sign-out.
- Preserve last-known investment values and successful timestamps when provider values are missing or use another currency; valid zeroes still update normally.
- Reject duplicate investment identities and add regression coverage for distinct transactions with identical content.
- Update the pinned SnapTrade SDK to 12.2.22 and Axios to 1.20.0 to address dependency advisories.
- Add an isolated synthetic browser check and document evidence boundaries. No new setup, accounting definitions, provider calls or public deployment are introduced.

## 2026-09-16 — Purchase goals and long-term funds

- Add separate purchase wishlists and long-term funds, progress, product links, notes and desired dates.
- Reserve existing cash with individual monthly contributions, a combined limit, protected bills/buffer and opt-in scheduled allocation.
- Track purchases and payment holds without creating duplicate expenses or moving bank money.
- Add idempotent commands, revision conflicts, cash freshness checks, invented demo goals and setup/recovery documentation.
- Cash balances are confirmed manually in BAS; this release does not add a bank-balance provider, paycheck forecasting or automatic refund matching.

## 2026-09-12 — Bring your own AI provider

- Add server-side OpenAI, Anthropic and Google Gemini adapters with default models; retain local Ollama and no-AI summaries.
- Add `npm run setup:ai` with hidden key entry and preservation of existing settings.
- Show provider/model status and saved reply attribution, with sanitized access, quota, model and connectivity errors.
- Document API access/billing, aggregate-only cloud context and provider retention boundaries. Tests use mocked providers; no live account acceptance is claimed.

## Mobile presentation update — 2026-09-11

- Dark theme throughout the dashboard, transactions, budgets, connections and assistant.
- Mobile screenshots now lead the README, with a gallery of every main view.
- Home-screen manifest, Android icons, Apple touch icon and standalone metadata.
- iPhone/Android installation instructions in the app and setup guide, including the HTTPS deployment prerequisite.
- No offline financial caching or network-access changes.

## 0.1.0 — 2026-09-11

Initial public starter release:

- Synthetic demo and isolated personal workspace setup.
- Responsive budget dashboard, custom categories, manual transactions and review.
- Atomic, cursor-safe Plaid transaction sync and encrypted access-token persistence.
- Explicit SnapTrade auth modes, read-only portal and account-value freshness handling.
- Deterministic assistant summaries and optional local Ollama integration.
- Authentication, exact-origin validation, regression tests, CI and release-content checks.
- Setup, API, architecture, contribution and security documentation.

Live provider connections, OAuth institution support, physical-phone use and hosted multi-user deployments have not been validated for this release. See `docs/VALIDATION.md` for the evidence boundary.

### Companion styling and development workflow

- Match the emerald/slate dark palette, system font, card styling and app icons.
- Refresh mobile and desktop demo screenshots; use 16px mobile form fields.
- Add paired-repository instructions and an honest capability-parity backlog.

## Detailed mobile design proposal

- Added a synthetic 19-screen preview, 66 feature contracts and 12 chart specifications in the established emerald/slate theme.
- Planned durable AI conversations and phone home-screen lifecycle, keyboard, accessibility and performance acceptance.
- Added local demo conversation persistence, recovery-state controls and dark mobile screenshots. These are design artifacts; runtime feature gaps remain documented in the parity table.

## BAS identity and public mobile UI

- Renamed the project and repository to BAS — Budget Automation Studio (`budget-automation-studio`).
- Added an original emerald fish logo, favicon and phone installation icons.
- Updated the real public mobile UI with a compact BAS header, five labeled tabs, clearer page hierarchy and a unified cash-flow card.
- Refreshed dark mobile screenshots and setup/clone instructions. The complete overhaul and durable server chat history remain planned.

## Mobile keyboard handling

The dedicated assistant page responds to visual-viewport keyboard changes, keeps the focused composer in view and temporarily hides bottom tabs during composition. It never autofocuses or disables pinch zoom. Physical-device keyboard acceptance remains open.

## 2026-10-17

- Added a cash-plan preview for uncertain income, with verified cash observations, finite confirmed receipts, bill timing, reserves and freshness warnings.
- Added a read-only daily financial check and explicit opt-in cached Plaid ingestion. Concurrent syncs cannot overwrite a newer committed cursor.
- Documented setup, privacy, scheduling ownership and incomplete-coverage limits.

## 2026-10-27 — BAS brand foundation

- Added a portable product page, visual brand guide, original-fish lockup and social SVG master.
- Refined the local app entrance and compact wordmark without changing financial behavior.
- Added public product/company links, honest illustrative-preview labels and reproducible static preview instructions.
