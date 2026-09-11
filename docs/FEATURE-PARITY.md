# Feature parity and safe adaptations

Reviewed 2026-09-11. These repositories share a product direction, not identical code. “Available” describes source capability; it does not prove live-provider or device acceptance.

| Capability | Personal app | Public starter | Status / next action |
|---|---|---|---|
| Emerald/slate mobile styling | Existing system with light/auto/dark modes | Matching dark tokens, cards, controls, phone screenshots | Dark visual language aligned; public light/auto modes remain a gap |
| Budget and transaction review | Rich categorization and approval workflow | Configurable categories, monthly budgets, manual entry, review | Available with different scope; preserve totals in future ports |
| Plaid | Personal ingestion and reconciliation | Configurable adapter and synthetic demo | Basic capability available; advanced reconciliation remains a gap |
| SnapTrade | Wealth, holdings, account activity | Configurable connection and holdings adapter | Basic capability available; private analytics not yet generalized |
| AI / chatbot | Richer personal analytics tools | Read-only summaries, optional local Ollama | Available with reduced data scope; no private prompts or context copied |
| Goywise / shared expenses | OAuth, prepare/commit, stable purchase identity and Review UI | Not implemented | Existing parity gap: next adapter port must use adopter-owned OAuth, fictional participants, integer cents, explicit commit and retry-safe action identity |
| Home-screen app | Mobile web UI | Manifest, icons, iPhone/Android setup instructions | Public install metadata available; secure remote hosting and physical-phone validation remain separate gates |
| UI redesign | Synthetic interactive concept and implementation plan | Not implemented | Plan only; implement reusable approved changes in both repos together |

## Per-change record

For each future feature, record: user-visible behavior; private implementation; public generic implementation; privacy adaptation; tests in each repo; setup/docs updates; release status. Link only public artifacts in this public document. Keep private implementation paths and commit details in private notes.

## Validation for this styling/workflow update

Public release checks cover formatting, tests, allowed files, and credential-pattern detection. Screenshots must be reviewed manually and captured only from the synthetic demo. Existing integration tests use mocks; they do not establish provider acceptance. The initial parity gaps above are explicit backlog, not completed features.
