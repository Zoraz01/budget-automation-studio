# Mobile overhaul implementation and rollout plan

Status: planned, 2026-09-11. The approved visual direction is the detailed synthetic mobile preview. No runtime implementation, migration or deployment is performed by this planning update.

## Outcome and decisions

Build the real application around the existing emerald/slate visual language, five mobile destinations (Home, Review, Activity, Wealth, More), complete chart interactions, and durable AI conversations. Keep every existing capability reachable throughout the change. The design catalog is the scope baseline: 66 feature contracts and 12 chart contracts, including API-only capabilities and explicitly proposed additions.

- Preserve the current application frameworks and accounting logic. Refactor presentation and add persistence behind existing authentication; do not turn the static prototype into the production app by copying its fixtures or simulated actions.
- Use small, independently reviewable commits on a `codex/mobile-overhaul` branch in each repository. Shared capabilities are adapted separately; histories, secrets and personal data never cross repositories.
- Add a reversible UI selection for the new experience. It must not affect authorization, provider permissions or financial semantics. Old URLs continue working through compatible routes or redirects.
- Save conversations on the authenticated server by default until deleted. Keep model context bounded independently of saved history. Browser-local prototype history is not the production store.
- Keep the current backend endpoints where semantics already match. Add version-compatible chat endpoints and missing generic provider capabilities explicitly. A new label or chart must not quietly change the underlying calculation.
- Begin without offline financial writes or cached financial responses. Home-screen installation, good lifecycle handling and a keyboard-safe composer are the first mobile deliverables; add service-worker shell caching only after its update and auth behavior is tested.
- Use two release checkpoints. Checkpoint A is an optional early phone trial; Checkpoint B completes the overhaul. Neither checkpoint means unimplemented public features are complete.

## Delivery sequence

All milestones below start **not implemented**. Completion requires working code, tests appropriate to risk, documentation, and a public-counterpart record. The interface remains usable if a later milestone is unfinished.

| Milestone | Deliverable and scope | Dependencies | Exit evidence |
|---|---|---|---|
| M0 — Safe development and baseline | Explicit isolated environment/database and stubbed providers; startup/migration control; synthetic reference fixtures; route/API/chart baseline; immutable build output and rollback rehearsal design | None | A test boot cannot touch the live database, load personal provider credentials, migrate production or start paid work; existing regression suites pass |
| M1 — Mobile foundation | Shared tokens, cards, controls, sheets, five-tab shell, More directory, URL/scroll/filter restoration, legacy route compatibility, theme/privacy, install metadata, safe areas and auth recovery. F58–F64 | M0 | Old and new navigation reach all current capabilities; 360/390/430px layouts, focus return, standalone Back and authentication regression checks |
| M2 — Durable AI history | Owner-scoped conversations/messages/jobs, encrypted content, idempotent send, bounded worker execution, library/thread/composer, rename/pin/archive/delete and history context. F53–F57 | M0, M1 | Reload/relaunch/server restart persistence; negative ownership tests; duplicate send and interrupted-job recovery; deletion during generation; no prompt logging |
| M3 — Home and planning | Real monthly summary, source freshness, savings explanation, insights, forecast and paycheck planning. F01–F09; C01–C04 | M1; M2 for checkpoint A | Totals agree with the existing backend on the same fixtures; real period controls update queries; forecast toggle, chart selection and transaction drilldowns work |
| M4 — Activity, review and organization | Purchase review/edit/split/approval; refund links; sharing prepare/commit/recovery; paginated activity, tags and receipts; category management and account lookup. F10–F28, F47–F49, F66 | M1, M3 | Exact-cent split checks, protected/uncertain shared actions, duplicate-safe commits, CRUD validation, upload/download authorization and preserved filters/drafts |
| M5 — Analytics and wealth | Trends, recurring rules, budgets, outliers, net/current worth, accounts/liabilities, holdings, debt and retirement; preserve snapshot recording. F29–F46, F65; C05–C12 | M1, M4 | Every chart has correct units/series, touch and keyboard selection, exact values, missing/stale states; calculation fixtures and snapshot behavior remain correct |
| M6 — Connections and release hardening | Honest provider states, adopter configuration, reconnect/return paths, AI configuration, real phone checks, large datasets, measured bundles and performance. F50–F52; revalidate F58–F64 | M2–M5 | No provider action implied by ordinary navigation; complete feature/chart ledger; physical-device and deployment evidence below |

M2 and M3 can be developed as separate workstreams after M1, but saved-history schema/job behavior must be integrated and tested before checkpoint A. No need to parallelize agents to execute the plan.

## Implementation structure

Create a small component layer: AppShell, ScreenHeader, BottomNavigation, MetricCard, ChartCard, DataState, TransactionRow, DetailSheet, ConfirmAction and ChatComposer. Keep page-specific rules in their feature modules. Shared components own layout/accessibility; backend/domain functions own money and authorization.

Model browser routes for conversations and deeper destinations, not just ephemeral overlay state. Preserve existing bookmarks for transactions, analytics, wealth, categories and provider returns. Keep chat drafts scoped by conversation; route changes or a new thread must not accidentally send the previous thread's draft. Use a single request/cache strategy with request cancellation, bounded pages, explicit refresh and per-source timestamps. Choose whether to extend the current data hook after measuring it; avoid adding a state library without a demonstrated need.

Load chart and Markdown dependencies on demand. Keep existing icons and system typography. Do not load the complete design catalog, design controls or synthetic fixtures in the production bundle. UI selection is presentation-only and cannot enable an authentication bypass.

### Migration and chat implementation order

1. Introduce explicit test/runtime configuration and schema validation so a test import or routine restart cannot unexpectedly migrate the live store.
2. Add additive schema migrations for conversations, messages, preferences and generation jobs, with a tested database backup/restore procedure and backward compatibility for the previous server version.
3. Implement owner resolution, encryption/key-version handling, no-store responses, bounded pagination, concurrency/revision checks, validation and negative authorization tests before wiring the chat UI.
4. Persist a user message and queued job atomically before generation. Give each send a client request id. A reconnect fetches the existing job; it does not automatically invoke the provider again.
5. Execute through a bounded server worker that can resume queued work and detect expired leases. A crash after provider acceptance becomes interrupted/unknown unless provider-supported retrieval/idempotency resolves it. Preserve the user's ability to decide whether to retry.
6. Connect the library/thread UI, then add management, retention and late-result deletion tests. Keep the legacy ask path compatible during the transition.
7. Offer an explicit one-time import of an existing browser-session conversation if it is still present. Preview what will be saved, use an import identity to avoid duplication, treat imported messages as untrusted history, and never claim recoverability of already-lost sessions. Remove the old local copy only after verified storage and the user's choice.

Detailed semantics and acceptance cases remain in [CHAT-HISTORY.md](CHAT-HISTORY.md).

## Two reviewable release checkpoints

### Checkpoint A — Early phone trial

M0–M3 complete in both repositories for their supported feature scope. New shell, Home/forecast/paycheck and saved conversations work with real authenticated application data. Review, Activity, Analytics, Wealth and Categories remain reachable through their existing functional screens until replaced. Label remaining legacy presentation in the change notes; do not present this as the full overhaul.

Before deploying A: pass accounting and auth regressions, isolated production build, history failure/restart tests, authenticated synthetic browser journeys and rollback rehearsal. Verify the external HTTPS auth path without weakening the owner restriction. If these gates pass, prepare the concrete release artifact and apply the deployment sequence below. A phone trial is an acceptance activity after deployment, not proof that the new code is already optimized.

### Checkpoint B — Complete overhaul

M4–M6 complete. Every F01–F66 and C01–C12 row has an implementation location, check result and counterpart status; every proposed feature is either implemented or explicitly called out as an unresolved release blocker. Remove legacy presentation only after the corresponding replacement has passed acceptance. Keep rollback artifacts through the observation period.

Publish the public companion's generic capabilities and updated setup guide separately after its checks. Its adopter-owned HTTPS hosting/auth setup must be documented and validated for any supported deployment path; private infrastructure is never a public template. Shipping an open-source commit does not deploy an adopter's app.

## Release procedure and rollback

The exact commands, artifact identifiers, database backup location and service target must be filled in the private release record from fresh checks before deployment. Do not run a broad first-time installation script for a UI update.

1. Confirm clean intended commit scope, remote identity/visibility, current service version, relevant job activity, disk headroom and authenticated health. Record baseline aggregate checks privately without putting balances into public release notes.
2. Build frontend output into a new versioned directory. Retain a matching previous frontend/server pair. Verify deep-link fallback, asset availability, runtime config and owner-only API access against the candidate.
3. If a schema change is included, create a consistent SQLite backup using a supported database backup mechanism; copying only the main file while WAL writes are active is insufficient. Verify integrity and a restore into an isolated location. Keep the matching encryption key available through protected recovery storage without embedding it in the backup or repository.
4. Coordinate only the processes that write the affected store, and let active financial confirmations finish or preserve their durable state. Apply reviewed additive migrations explicitly. Validate the target schema before starting the new server. Do not refresh providers as a deployment side effect.
5. Activate the matched frontend/server release through a controlled switch and only the necessary service restart. Preserve referenced old assets long enough for already-open clients; prevent half-old/half-new bundles. Do not change DNS, tunnels, scopes or provider permissions unless a separate demonstrated requirement exists.
6. Check local health, external HTTPS, authenticated Home, source freshness, pending counts and same-period totals. Verify existing transactions are intact. Use synthetic tests for mutation coverage; do not make a real purchase approval, shared expense or bank action merely to smoke-test deployment.
7. Open the installed phone app, confirm version and exercise the device journey below. Avoid starting a paid AI request as a silent smoke test; use a deterministic test provider before release, and run a real-provider check only within existing explicit authorization.
8. Observe the first normal refresh and app resume when that evidence is available. Check errors, duplicate generations, stale/chunk failures and financial invariants; record observation duration and unobserved scheduled work honestly. This plan creates no automatic monitor.

Rollback triggers: auth regression, changed accounting totals without intended data changes, duplicate/uncertain financial actions, inaccessible core routes, lost history or a repeatable mobile blocker. Restore the previous matched server/frontend release and disable the new UI selection. Additive chat tables can remain; preserve newly saved messages. Never restore an old database over newly recorded financial activity as a routine UI rollback. If schema/data repair is required, stop affected writes, reconcile changes since backup, and use a separately reviewed recovery procedure. A worker rollback must leave running/unknown jobs recoverable without automatic paid replay.

## Acceptance matrix

| Area | Required proof |
|---|---|
| Accounting | Same fixtures and periods produce unchanged income, effective spending, transfers, cash flow, balances, refunds, debt and projections; missing data stays missing |
| Mobile layout | 360/390/430px portrait plus landscape; 44px targets, 16px inputs, safe areas, visible validation, 200% text and reduced motion |
| Installed phone journey | Launch icon → auth → Home/chart → Activity detail → Review split without external commit → AI library/thread → keyboard → background → resume → sign-out/re-auth |
| Lifecycle | Network loss, session expiry, app suspension and OS eviction recover without losing saved messages or replaying financial/model requests |
| Accessibility | Keyboard and screen-reader core journey, focus trap/return, accessible names and chart exact-value alternatives |
| Performance | Record payloads, device/network/cache state and cold/warm timings; evaluate the budgets in MOBILE-WEB-APP.md with representative long lists and conversations |
| Security | Owner-bound history and attachments; no prompt logs or private caches; server-only credentials; failed auth cannot reveal remembered content |
| Public release | Counterpart tests, formatting, content allowlist, secret scan, manual synthetic-data review, setup-from-clean-checkout check and CI |

A desktop viewport check cannot close the installed iPhone/Android rows. Record each platform separately and distinguish owner-reported results from directly observed tests.

## Execution ledger

For every feature and chart in the catalog, maintain: ID, milestone, private implementation, public implementation, state (planned/in progress/verified), test/evidence, remaining gap. The private ledger may link private source and release records; the public ledger links only generic/public artifacts. Update [feature parity](../FEATURE-PARITY.md) during each milestone rather than at the end.

No implementation milestone is complete yet. First executable slice: M0 isolation and baseline, followed by the M1 shell using the current screens. This gives a safe place to integrate the approved design before introducing chat migrations or changing financial workflows.
