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
| UI redesign | Detailed synthetic preview: 19 screens, 66 feature contracts and 12 chart contracts | Same generic preview and specification | Design parity only; runtime implementation remains pending |
| Saved AI conversations | Browser-local demo plus authenticated server-history design | Same generic demo and provider-neutral persistence design | Production persistence not implemented in either runtime by this design update |

## Per-change record

For each future feature, record: user-visible behavior; private implementation; public generic implementation; privacy adaptation; tests in each repo; setup/docs updates; release status. Link only public artifacts in this public document. Keep private implementation paths and commit details in private notes.

## Validation for this styling/workflow update

Public release checks cover formatting, tests, allowed files, and credential-pattern detection. Screenshots must be reviewed manually and captured only from the synthetic demo. Existing integration tests use mocks; they do not establish provider acceptance. The initial parity gaps above are explicit backlog, not completed features.

## Overhaul execution plan

The [implementation plan](design/IMPLEMENTATION-PLAN.md) schedules M0–M6 with an early shell/Home/history trial and a complete-overhaul checkpoint. Both runtimes remain unmodified by this planning update. Each milestone must carry its generic counterpart, tests, setup changes and explicit gaps.

## BAS public identity and mobile presentation

Public project renamed **BAS — Budget Automation Studio**, with an original fish mark, matching home-screen icons, updated mobile runtime typography/navigation/summary cards and refreshed synthetic screenshots. The personal app keeps its Finance name and the shared emerald/slate design direction. Product naming is intentionally different; advanced overhaul/history milestones remain planned.

## Private mobile UI release — 2026-09-11

Private runtime now implements the five-destination shell, More directory, analytics tab links, the updated real-data cash-flow card and a native modal AI panel with visual-viewport sizing, focus return and no automatic keyboard opening. Existing financial pages/charts and backend calculations remain in place. This is the first UI release, not completion of all 66 overhaul contracts or durable server history.

BAS already has the matching card/typography/five-tab mobile presentation for its smaller feature set. Its dedicated chat page now responds to keyboard viewport changes without stealing focus. Private analytics shortcuts have no BAS counterpart until the documented analytics backlog is implemented. Native modal versus dedicated chat page is an intentional architectural difference. Physical-phone keyboard acceptance and server history remain open in both projects.

## Compact Home header — 2026-09-12

Both runtime Home screens omit the introductory marketing text and start with period selection and the financial summary. A visually hidden Home heading preserves accessibility. Other pages and financial calculations are unchanged. This presentation-only change needs no setup changes or data migration. Validation: production frontend build, mobile browser layout checks, and the public formatting, test and release checks.

## Saved assistant history — 2026-09-12

Both runtimes now save encrypted server conversations, show a paginated history library and support New chat, rename, pin, archive/restore and confirmed deletion. Accepted questions and generation status survive navigation; restarts mark unfinished work interrupted without automatic replay. Idempotency, revision conflicts, ownership, failed generation and late results after deletion have isolated regression coverage. Browser checks cover saved replies after reload and a 390px mobile layout.

The private app uses a separate chat database and verified owner identity with bounded recent model context. BAS uses its local workspace database and password session, with its existing aggregate-only adapter: saved older messages are not model context. Synthetic demo startup retains its encryption key across restarts. No provider integrations or financial calculations are copied between projects. See [setup and recovery](CHAT-HISTORY.md).

This closes basic durable-history parity, not all of M2: search, scheduled retention, legacy browser-history import, conversation URLs, multi-process leases and key rotation tooling remain planned. Existing browser-only conversations are not retroactively recovered. Physical-phone acceptance remains open. Validation: private regression suite and isolated frontend build; public tests, formatting, release allowlist, secret scan and manual public-source review. Private production activation is recorded separately; public publication is a source release.

## Fish bookmark and home-screen icon — 2026-09-12

Both apps now use the existing BAS fish artwork for browser bookmarks and installed home-screen shortcuts, with SVG/PNG favicons, a 180px Apple touch icon, and 192px/512px manifest icons. The personal app retains its Finance display name. Private icon URLs are versioned so the new artwork is fetched; BAS already used these fish assets and gains a PNG favicon fallback. Only approved public artwork was reused. Validation covers the production build, icon dimensions/byte identity and served HTML/manifest/icon references. Actual phone icon refresh still depends on the device; recreate an existing shortcut if it retains the old artwork.

## Opaque home-screen icon correction — 2026-09-12

Both apps now render home-screen PNGs from a square fish SVG with an opaque dark background. The former transparent rounded corners could appear white when the phone applied its own icon mask. The phone now supplies the corner shape; versioned icon and manifest URLs request fresh artwork. Validation checks exact sizes, absence of PNG alpha, dark edge pixels, public asset routes and deployed private icon bytes. Existing iPhone shortcuts may need to be recreated to replace their cached icon.

## Cloud AI setup — 2026-09-12

BAS now supports OpenAI, Anthropic and Google Gemini with a server-side API key and default model, alongside local Ollama and deterministic summaries. `npm run setup:ai` provides a hidden-key terminal prompt and preserves existing authentication, vault and financial-provider settings. Connect shows the configured provider/model; saved replies retain their original provider label. Safe errors distinguish access, quota, model and connectivity failures. No automatic retries or background model calls are introduced.

The private app already has an Anthropic API-key integration; its setup is now documented explicitly. Shared capability: cloud AI authenticated by an operator-supplied server key and durable chat history. Intentional architecture difference: private chat retains its existing read-only tools and recent conversation context; public chat receives only the new question and allowlisted monthly aggregates. Private three-provider selection remains absent because switching its tool-enabled agent requires separate adapter/tool-contract validation; this entry does not claim interchangeable-provider parity. The generic public setup is fully implemented without copying private settings, prompts, data or deployment files.

Validation: 59 public tests pass, including mocked cloud request/response contracts, no-network demo mode, secret exclusion, saved cloud replies/errors and configuration-file preservation. The hidden-key wizard and 390px mobile cloud chat were checked using synthetic settings and a mocked adapter. Formatting, release allowlist, secret scanning and manual public diff review passed before publication. Private changes are documentation and a blank environment example, checked against its existing key loader; no private runtime/provider change or production deployment is needed. Cloud account/billing acceptance requires the adopter's own credentials and is not established by mocks.

## Purchase goals and long-term funds — 2026-09-16

Both runtimes now implement the approved mobile Goals interface: separate purchase/wishlist and long-term views, target/date/link/notes, funding order, individual monthly contributions within a combined limit, manual reservations, release/reassignment, completion/archive/restore, and an audit history. Source capability is implemented; production activation is a separate step.

Both use a generic integer-cent reservation ledger with atomic and idempotent commands, revision conflicts, explicit protected bills/buffer, freshness checks, full-or-wait monthly allocations, a goal/month retry identity, and no historical catch-up burst. Recording a purchase preserves a cash payment hold until explicit settlement; transaction links never create a second expense. Provider changes remain visible for review. Actual income, spending, balances, and net worth remain unchanged by virtual saving.

Privacy adaptation: the portable core and UI contain no private fixtures or provider configuration. BAS uses adopter-confirmed cash observations because its transaction adapter does not provide cash balances or account payment types. Finance offers its existing depository balance feed and subtracts primary-checking reservations from its paycheck scenarios. BAS does not claim that private forecast capability; adding its own cash-provider adapter or paycheck forecasting remains an explicit gap. Both support manual observations and the same reservation rules.

Setup and limits are in [Goals](GOALS.md): one backing cash source, monthly day 1–28/time zone, 36-hour cash freshness, 35-day protected-money review, optional automatic processing while the server runs, payment-hold confirmation, and explicit refunds/correction limitations. Fresh installs have no goal amounts, monthly cap, or automatic allocation enabled; demo fixtures are invented and automatic saving is off.

Validation: Finance passes 63 regression tests, including its cash/transaction adapter, plus a production frontend build into an isolated temporary directory. BAS passes 82 tests, including authenticated session/origin/HTTP checks. Both interfaces pass synthetic browser checks at 320, 390, 768 and 1280 pixels with no horizontal overflow or page errors; dark-mode screenshots were reviewed. Purchase holds survive reload. A simulated read failure after a successful save confirms the UI retries the exact command without duplication. Public formatting, release allowlist/credential scanning of all 78 staged files, and manual review of the added source, documentation and invented fixtures pass. No screenshots or private runtime data are included in the release. Physical-phone and live-bank acceptance are not established by these checks.
