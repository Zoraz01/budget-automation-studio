# Architecture and customization

## Scope and boundaries

One application process serves one personal workspace on loopback. The design separates the browser, authenticated HTTP API, domain calculations, SQLite store, provider adapters and chat context. It makes no assumptions about employers, institutions, income level, merchant names, saving targets, deployment domains or an existing home server.

```text
server/
  index.mjs           Process lifecycle; loopback listener
  config.mjs          Explicit environment and mode validation
  app.mjs             Session, origin, rate, request and route boundaries
  domain.mjs          Integer-cent arithmetic, input validation, budget summaries
  store.mjs           SQLite schema, atomic writes, connection persistence
  vault.mjs           AES-256-GCM with per-connection associated data
  providers/
    plaid.mjs         Paginated transaction sync with staged commit
    snaptrade.mjs     Read-only connection and account-value adapters
    ai.mjs            Narrow aggregate context and local chat adapter
web/
  index.html          Semantic shell and restrictive script loading
  app.js              Views, forms, escaped output and API interaction
  style.css           Design tokens, responsive layout, focus and touch targets
scripts/
  setup.mjs           Fresh instance credentials; refuses overwrite
  check-release.mjs   Publication allowlist and content patterns
```

## Data model

| Table | Responsibility |
| --- | --- |
| `meta` | Workspace currency, seed marker, stable provider registration identifiers |
| `categories` | Custom expense categories plus income and transfer categories |
| `budgets` | Per-category integer-cent limit keyed by month |
| `transactions` | Stable source ID, date, signed cents, currency, category and review flags |
| `connections` | Encrypted provider credentials, Plaid cursor and last import status |
| `investments` | Independent account value observations, currency and freshness labels |

All SQL parameterizes user values. Transaction IDs are namespaced per Plaid connection. The client-facing state query omits encrypted credentials and cursors. The server exposes only four explicit static asset paths; its source, `.env` and database directory cannot be downloaded as static files.

## Financial semantics

- Amounts are signed integer cents. Positive means an outflow; negative means an inflow.
- Income is the negative sum of posted income-category amounts. Income reversals reduce income.
- Spending is the sum of posted expense-category amounts. Negative expense rows reduce spending as refunds.
- Posted means not pending and not provider-removed. Removed rows remain in the local audit record.
- A transfer between your own accounts is excluded from both income and spending. A provider's generic transfer label is insufficient evidence of ownership, so it does not automatically exclude the entry.
- A provider `INCOME` label initializes the Income category; all other imported categories start Uncategorized. Every imported row starts unreviewed. User category selections survive provider updates, but changed amounts, dates and descriptions reopen review.
- Unreviewed posted entries count in the provisional totals. The UI shows the review count so users know classification is unfinished.
- Net cash flow is income minus spending. It is not account balance, net worth or an amount safe to spend.
- Investment values are presented separately. The app never treats an investment account's total value as spendable cash or adds it to the month's cash flow.
- Refunds are recognized in the month posted, including refunds for earlier purchases. There is no accrual/amortization or refund-to-original-purchase matching.
- Manual entries cannot be automatically deduplicated against later provider imports. Do not manually recreate transactions you intend to sync.

## Provider synchronization

Plaid stages up to 100 pages per sync. It normalizes and validates all rows before writing any batch. If pagination changes underneath the request, it retries from the original stored cursor, at most three attempts. Within one SQLite transaction it upserts additions/modifications, marks removals and advances the cursor. A network error or currency rejection preserves the previously committed rows and cursor. This starter serializes provider/AI operations in the application process; it does not support multiple writers or horizontally scaled processes.

SnapTrade uses explicit Personal or Commercial SDK auth. Connection URLs must be HTTPS under `snaptrade.com`. Portal creation requests read-only access. A successful account-list import updates visible accounts and marks omitted accounts stale. Missing values remain null; zero is preserved when explicitly returned. A failed refresh marks prior observations stale without overwriting their numbers.

Both adapters read provider-cached financial data. An application import timestamp does not establish live bank freshness. No force-refresh API, scheduled polling, trading call or automatic destructive reconciliation is included.

## AI boundary

`assistantContext(summary, currency)` constructs a new allowlisted object rather than spreading raw application state. The assistant receives only the question, month, currency, category names, reviewed/pending counts and totals. It cannot access SQLite or the credential vault. Responses are rendered as escaped text, including when they contain HTML or Markdown.

To add a hosted AI service, implement another provider inside `answer()` and add explicit config and UI disclosure of the recipient and data sent. Keep credentials server-side, retain timeouts and output limits, and add tests ensuring the context cannot grow to include sensitive raw records. Do not turn model text into SQL or executable actions. If write actions are introduced later, design a separate validated proposal-and-confirmation flow.

## Design decisions

The interface uses a muted green palette, high-contrast primary actions, local system fonts and no image/font CDN. Desktop navigation becomes a five-item bottom bar below 850px. Budget progress includes explicit numbers and text, rather than relying on color alone. Dialogs use native focus trapping; controls have visible focus and touch-friendly target heights. Motion respects `prefers-reduced-motion`.

Framework-free ES modules reduce setup and dependency surface for this starter. The route code and UI are deliberately compact, but should be split into dedicated route/view modules as features grow. Native synchronous SQLite is appropriate for a small personal instance, not an unbounded API workload.

## Extension recipes

### Another bank provider

Create an adapter that returns validated dates, integer cents, a currency, stable namespaced IDs and explicit pending/removed flags. Stage the full batch and commit data plus provider checkpoint atomically. Add fixtures for retry, removal, duplicate import, changed category and mixed-currency rejection. Preserve review state only when the underlying transaction is unchanged.

### A different UI framework

Replace `web/` while retaining the documented API contract and origin/session checks. Provider SDK credentials stay in the Node server. If adding a bundler, add a narrowly scoped static build directory and test that private paths remain inaccessible. Never inject server environment variables wholesale into the front-end bundle.

### Shared hosting

Introduce a real identity model and workspace/user foreign keys before supporting a second user. Enforce ownership within SQL, not only at route entry. Replace in-memory sessions and locks with deployment-appropriate storage. Add TLS, secure cookies, trusted-origin configuration, credential management, bounded pagination, backups, migration tooling and observability with redacted logs. This is additional engineering work, not an existing deployment switch.

### Schema changes

The first release creates schema version 1. Add numbered transactional migrations with rollback/recovery instructions before altering it. Keep historical demo fixtures synthetic. Never borrow a personal database or credential file to make a test realistic.

## Upstream references

Implementation details were checked against [Plaid Transactions sync](https://plaid.com/docs/api/products/transactions/#transactionssync), [SnapTrade authentication modes](https://docs.snaptrade.com/docs/authentication-methods), the [official SnapTrade SDK](https://github.com/passiv/snaptrade-sdks), and [Ollama chat](https://docs.ollama.com/api/chat). Follow the providers' current documentation when extending the integration.
