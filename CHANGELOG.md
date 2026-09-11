# Changelog

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
