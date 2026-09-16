# Purchases and long-term goals

Goals reserves cash for a purpose without moving money or changing income, spending, account balances, or net worth. The same reserved dollar cannot fund two goals. This is a planning ledger, not a bank account or a guarantee of affordability.

## Everyday use

Open **Goals** from the Home shortcut (or the desktop sidebar). Purchases and long-term funds have separate lists. An unfunded purchase stays on the wishlist. Long-term funds may omit a target, and support partial purchases while contributions continue.

1. Create a goal with its estimated target, optional product link, notes, desired date, and funding order. Use $0/month to save an idea without committing money. Funding order 1 is first; 0 is unranked and comes last.
2. Set a combined **Monthly plan** limit. Set each goal's contribution within it. This limit is for recurring goal allocations, not your entire household budget. Existing investments, other savings commitments, bills, and living expenses must still fit outside it.
3. Complete **Funding setup** before setting cash aside. Choose one backing cash source, protect upcoming bills/card payments and a cash buffer, and confirm these amounts. The limit starts unset; no contribution or automatic saving is enabled on your behalf.
4. Set money aside manually, release it to unassigned cash, or move it to another goal. Moving a reservation does not allocate new cash. Reservations carry across months. A fully reserved target pauses monthly contributions; releasing money does not automatically resume them.
5. Record the actual purchase price, optionally linking a matching transaction. For a purchase goal, unused reservations are released and the goal is completed. A long-term fund remains active after partial purchases.
6. Review **Purchase payments**. The purchase amount stays held until you explicitly confirm that payment is reflected in the backing cash balance. A credit-card purchase must keep its hold until the card is paid. Recording a goal purchase does not create an expense transaction: imported or separately recorded transactions remain the spending source of truth.

Completed and archived goals retain their history and can be restored with monthly contributions off. Archiving or completing a fund requires confirmation and releases only unspent reservations, not purchase payment holds.

## Cash sources and freshness

The public transaction adapter does not supply reliable depository balances or identify a transaction's payment account type. Confirm the available balance of your chosen cash account manually; identify cash/debit versus card when recording a purchase. This is a deliberate adapter boundary, not an inference from monthly cash flow or investment values. A new provider adapter may implement the cash-source contract without changing the reservation ledger.

Each cash observation must be no older than **36 hours**. Protected bills and buffer must be reviewed at least every **35 days**. Confirm the observed cash balance again when needed; changing a displayed label does not imply a bank sync. Negative balances are retained as overdrafts. Missing or stale balances are never converted into zero or treated as available.

All goals in this version share one backing cash source. Changing that source requires releasing reservations and settling payment holds first. Stock portfolios, retirement balances, credit limits, and emergency funds are never automatically counted as goal cash. Exclude the separately shown purchase payment holds from protected bills/card payments so they are not reserved twice. The cash-available figure is the recorded source balance minus protected bills/buffer, goal reservations, and payment holds. It is not an unrestricted safe-to-spend promise.

If cash falls below those claims, the existing reservations stay visible with a shortfall. No goal is silently reduced or funded by borrowing from another. Review pending debits and actual card bills when confirming protected money; the app cannot prove the completeness of those obligations.

## Automatic monthly allocations

Automatic saving is an explicit Funding setup option. Choose day 1–28 and an IANA time zone, such as `America/New_York`. A new or resumed rule starts on the next scheduled date. The running application checks due contributions once a minute and once on startup; it makes no bank transfers, provider refresh requests, or AI calls.

- Allocations use integer cents in a SQLite transaction and have one unique identity per goal/calendar month.
- Funding order decides which goals are considered first. A contribution either fits in full (or is capped at the target) or waits. A smaller, lower-priority contribution may still fit.
- Missing/stale cash, overdue protection review, insufficient cash, or an exhausted monthly allocation limit produces a visible waiting reason. The checker retries after conditions improve.
- Missed earlier months are skipped, not accumulated into a large catch-up allocation. The current month's contribution can still run after downtime if fresh cash is sufficient.
- No future contribution counts as saved. Completion estimates assume the stated contribution continues; they are estimates, including when automatic allocation is currently off.
- The process must be running. This is not an operating-system scheduler, a bank standing order, or an external notification service. Waiting items appear in the app.

## Matching, refunds, and corrections

An optional link must match an existing positive posted purchase's full amount and currency. A transaction can be linked to only one goal purchase. Split the transaction using the host application's supported workflow before linking a smaller component, where available. The public starter has no transaction splitting.

A changed, pending, removed, or unavailable linked transaction is flagged for review. It never silently rewrites the reservation history. Change an incorrect transaction link explicitly. There is no automatic refund matching, purchase-amount correction, or refund-to-goal allocation in this version. A refund continues through ordinary transaction accounting; once reflected in the backing cash balance, explicitly reserve it again if desired. Do not count an unsettled card credit as new checking cash.

## Storage and recovery

Goals uses component schema version 1 (`goals_meta`) and adds only `goal_*`/`goals` tables to the existing workspace database. Startup creates the tables transactionally and leaves financial transactions untouched. The app uses its existing authenticated workspace/session boundary; goal text is escaped before rendering. Product links accept only HTTP(S).

Commands carry a durable request identity and the last observed revision. An exact retry returns the original result; reusing an identity for another action is rejected. A stale revision returns HTTP 409 so another tab or scheduler cannot silently overwrite an edit. On conflict, refresh and review before retrying. Network errors preserve the visible form; the same unchanged request can be retried safely.

Back up the workspace database before upgrading. To roll back application code, stop the new process and restore the previous source release. Leave the additional tables intact to preserve goals; the older app simply will not show them or run allocations. Restoring a database backup also rolls back later transactions and is a separate, deliberate recovery action.

The workspace supports up to 200 goal records. The UI shows the latest 200 ledger entries across goals and up to 25 per detail view; full history remains in the database. Transaction search returns up to 50 matches. No multi-currency conversion, multi-account funding, bank movement, push reminders, or offline writes are provided.

## Validation and demo

The synthetic demo adds invented goals to an empty goal store, with automatic allocation off. It never reads personal environment settings or calls providers in demo mode. Existing demo goals are not overwritten. For a fresh independent demo, run the absolute `server/index.mjs` entry point from a disposable working directory with `APP_MODE=demo`; its database is relative to that directory. Do not assume `DATABASE_PATH` is a supported setting.

Checks cover exact amounts, cash protection, stale/missing/negative balances, concurrent revisions, idempotent retry, rollback, priority, monthly target/cap behavior, local dates, restart recovery, payment holds, duplicate links, removal warnings, archive/restore, and persisted state after reopening. Authenticated HTTP tests verify session and origin protections. Browser checks use invented data at 320, 390, 768, and 1280 pixels, including edits, purchase holds, and reload persistence. This does not establish physical-phone or live-bank acceptance.

Use the existing [HTTPS Home Screen setup](SETUP.md) for a phone-accessible deployment. A loopback desktop demo address is not reachable from a phone.
