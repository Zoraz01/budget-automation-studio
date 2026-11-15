# Quick review concept

Open [the working preview](quick-review.html) or [the before/after comparison](quick-review-comparison.html). This is a synthetic design prototype for the selected A direction, not a runtime release. It changes no account data, approval endpoint, provider, database or production asset.

The default card shows the merchant, exact amount, date, category and account. **Approve** is the explicit confirmation for an ordinary local review and immediately advances the demo queue. It has no second confirmation dialog. **Edit** opens description, amount, date, category, account and transfer fields. Close or Escape discards the draft; **Save changes** returns to the summary; **Save & approve** applies the correction and advances. Editing alone never approves a purchase.

More options retains links to the earlier category-split, refund and sharing examples. These examples have their own invented fixtures; the selected purchase is not passed to those older demonstrations. Rejection and bulk approval still require confirmation. The refund example stays out of demo bulk approval and is never linked automatically. This is a demonstration of eligibility, not a new backend eligibility rule. Real posted/uncertain sharing protections, error recovery, duplicate-safe requests and server-side eligibility remain requirements for implementation.

## Source and references

Baseline: the Review screen in `mobile-concept.html#review`, captured from each repository's own synthetic prototype. Preserve the existing emerald/slate palette, system font, merchant/amount fixtures, editable fields and named advanced operations. No new dependency is needed to open the prototype.

The visual move is to show transaction details as a summary and expose editing on demand. The inspected [Copilot transaction detail](https://mobbin.com/screens/db951b8a-c61e-4fb6-b91b-ce3134c7fd0b) presents the transaction, category and account as read values; [Revolut transfer review](https://mobbin.com/screens/bbb103e7-3764-40f6-bc45-e71294fd7ee7) shows read values with an Edit entry. These are iOS structure references for a responsive web concept. They do not establish local bookkeeping approval behavior. Direct approval and Save & approve follow the user's requirement; the exact order and wording are our design choices. Payment initiation and external sharing keep their own confirmation requirements.

Broad payment-review results and recurring/category screens were not used as evidence for transaction-review semantics. The before/after board documents one visual move: the summary replaces the default form, with Edit beside Approve. Only the Review target is compared; the surrounding prototype shell is outside the captures. The earlier walkthrough remains design history.

## Reproduce the checks

Serve only the design directory with any static server, for example `python3 -m http.server 8765 --directory docs/design`, then open `/quick-review.html` on that local server. Stop that exact process when done. A desktop loopback address is not accessible from a phone. Physical-phone installation requires a reachable HTTPS deployment; see [mobile web app setup](MOBILE-WEB-APP.md).

For automated checks, install Playwright separately, including its Chromium browser, or supply its ESM entry through `PLAYWRIGHT_MODULE`. The repository's normal application dependencies do not include this optional design tool.

```bash
node scripts/check-quick-review.mjs
# Optional: overwrite only the invented before/after JPEGs.
CAPTURE_DESIGN=1 node scripts/check-quick-review.mjs
```

`DESIGN_OUTPUT` can redirect the optional images. The script opens local design files in a fresh browser context, blocks and reports HTTP requests, loads no application environment or database, and closes its browser in `finally`.

Validated independently in both repositories at 320, 390, 768 and 1440 CSS pixels: no page overflow; Edit and Approve are visible in the initial viewport and have at least 44px targets; Escape/Close preserve the original value; saving alone keeps the queue; direct approval and Save & approve advance it; corrected cents, account and transfer classification survive; bulk confirmation excludes the attention item; refund approval does not link it; rejection requires confirmation; completion/restart work. No HTTP request or browser exception occurred. Desktop browser checks do not establish physical-phone acceptance.

The private and public variants share only this generic design and invented fixtures, with their own identity and captures. Both runtime Review experiences remain unchanged by this concept. BAS's advanced split/refund/sharing gaps remain open in [feature parity](../FEATURE-PARITY.md).
