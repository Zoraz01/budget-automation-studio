# Cash planning when income is uncertain

On Home, expand **Build a 30-day cash plan**. Enter separately verified spendable cash and its observation time, a buffer, card/goal reserves, everyday spending, dated bills, and only confirmed future income. Use one `YYYY-MM-DD amount` line per bill or receipt. Leave income blank when uncertain. The preview does not persist inputs or change transactions, budgets, goals, subscriptions or accounts.

The baseline does not extrapolate salary. Each confirmed income entry is used once. Dates outside the 30-day UI horizon are rejected; the API supports 1–90 days and ignores out-of-window events. Unconfirmed income is excluded. Bills due today count, and same-day expenses are applied before income to expose timing risk. Current cash never comes from net period flow, investments, retirement assets or credit limits. Include bank holds and missing obligations; avoid duplicating a card payment in both dated bills and reserves.

All money uses integer cents. Missing cash is unavailable. Observations older than 36 hours, missing timestamps or future timestamps are flagged; incomplete coverage cannot produce a safe-to-save amount. The result is a partial scenario, not a complete bank payment calendar. Check lender statements, actual due dates, health coverage and new/irregular expenses. Changing a scenario does not confirm receipt of money or cancellation of a bill.

## Daily checks and optional ingestion

Use Node 24.10 or newer within the supported Node 24 line. From the BAS checkout after setup:

```sh
node scripts/daily-financial-check.mjs --database data/demo.sqlite
```

This opens the existing database read-only and reports connection delivery timestamps and states. It does not create a database, run migrations or contact providers. Demo mode has no bank connections; an empty connection list is not evidence of financial freshness.

An optional local JSON plan file can be passed with `--plan path/to/plan.json`. It uses the request shape below. Update `today`, cash, observation time and obligations before each review; a saved scenario is not live bank data. Keep files outside the repository or in ignored `data/` and protect report outputs.

For an adopter who explicitly wants scheduled cached Plaid ingestion, first configure and test their own personal connection, then run:

```sh
node --env-file=.env scripts/daily-financial-check.mjs --database data/personal.sqlite --sync
```

`--sync` is explicit permission to import cached transactions using the adopter's credentials. It calls only `/transactions/sync`; no paid on-demand institution refresh, balance product, AI or SnapTrade call is added. Existing Plaid service charges still depend on the adopter's agreement. Connections sync independently and partial failure exits nonzero. Cursor comparison prevents a concurrent browser sync from overwriting a newer committed cursor. The command uses an exclusive local lock; after a crash, verify no check process remains before removing its `.daily-check.lock` file.

Schedule this exact tested command once daily with your operating system's scheduler, using an absolute checkout working directory and the same Node executable. A second read-only check can run after it. The computer must be on, storage mounted, and credentials available. BAS does not install a scheduler or send notifications. Keep logs private; configure scheduler failure notifications yourself. A timestamp proves cached delivery, not the bank's latest activity. Auth expiry requires the adopter to reconnect. Do not use full reconciliation or retry paid products automatically.

## API

`POST /api/cash-plan` requires a session and same-origin JSON request. This is computation only. Example invented input:

```json
{
  "today": "2027-01-10",
  "days": 30,
  "cashCents": 200000,
  "observedAt": "2027-01-10T11:00:00Z",
  "bufferCents": 20000,
  "reserveCents": 10000,
  "dailySpendCents": 1000,
  "events": [
    {"date":"2027-01-15","amountCents":45000,"direction":"out","label":"Example bill"},
    {"date":"2027-01-20","amountCents":80000,"direction":"in","label":"Confirmed final pay","confirmed":true}
  ]
}
```

Results include `freshness`, `series`, `low`, `firstShortfall`, `projectedHeadroomCents`, `shortfallCents`, `bills` for 7/14/30 days and excluded unconfirmed income. `availableToAllocateCents` is always null through this preview because complete obligation coverage is not established. The public adapter intentionally uses manual observations and obligations; it does not claim automatic account balances or recurring-bill discovery.

Tests and screenshots use invented data and mocked providers, not live financial accounts. Source release does not establish hosted or physical-phone acceptance. Continue to use the documented loopback security boundary; a phone requires your own securely hosted HTTPS application.
