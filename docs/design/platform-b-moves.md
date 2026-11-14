# B: Spending first

Generic target-design notes. Baseline observations describe the companion Home study; advanced BAS runtime capabilities remain planned as documented in [the platform proposal](PLATFORM-OVERHAUL.md).

Status: static design study using invented fixtures. No runtime or financial action is implemented.

Axis: choose what leads Home. B makes posted spending the first read, followed by activity, with balances and budget beside it on desktop. On phones, the same reading order stacks vertically.

| Move | Job step and source break | Reference decision | Take | Leave | Judgement and cost |
| --- | --- | --- | --- | --- | --- |
| Lead with spending and its period | Understand this month's activity; the current Home leads with liquid cash flow and places spending in a secondary metric | [Rocket Money](https://mobbin.com/screens/c36ea480-12c5-4673-955b-fb1a38d86e39) and [Revolut](https://mobbin.com/screens/ef9b430c-0892-423d-96c4-839934a4d578) both show spending above a wide spending chart | A spending total, reporting dates and cumulative posted-expense chart form the largest module | Their branding, colors, sample data, offers and wording | The chart's exact dimensions and cumulative fixture points are authored for this preview. Spending receives more emphasis than review or planning. |
| Put balances beside spending | Understand what a spending figure represents; the current Home explains balance differences in a disclosure | [Rocket Money](https://mobbin.com/screens/c36ea480-12c5-4673-955b-fb1a38d86e39) places account balances beside the spending chart; [Revolut](https://mobbin.com/screens/ef9b430c-0892-423d-96c4-839934a4d578) places total assets beside it | A distinct account summary beside the chart, with timestamps and clearly named balance metrics | Account logos, connection promotions and provider-specific controls | Exact asset/liability composition and timestamp wording are this study's judgement. The whole-month budget follows the account summary and remains explicitly different from available cash. |
| Put recent activity immediately below spending | Find the purchase behind a total; current Home shows merchant/category charts before a transaction list | [Rocket Money](https://mobbin.com/screens/c36ea480-12c5-4673-955b-fb1a38d86e39) puts recent transactions directly under its spending chart | Dated transaction rows and amount alignment | Reference merchants, categories and sample transactions | One reference supports this detail. A four-item review summary is retained at the end of the activity list, so review remains below spending. |
| Keep income and cash flow supplementary | Distinguish movement from current balances | [Revolut](https://mobbin.com/screens/ef9b430c-0892-423d-96c4-839934a4d578) places income and net cash flow below spending | A separate compact flow module | Revolut's cash-flow arithmetic and labels | Finance's existing liquid-cash-flow semantics apply: $6,400 income minus $2,850 spending minus $1,200 accessible-savings deposits equals $2,350. The module stays distinct from the $8,420 checking balance. |

Existing Home information remains in lower sections: no-further-pay planning, buffer and reserves, goals, forecast and assumptions, monthly income/spending, complete category totals, merchant totals and previous-period insights. Their condensed rows and disclosure placement are this study's judgement, not additional research findings. The shell, navigation, palette and system typography are shared across all directions.

Downside: spending has the strongest emphasis; the review queue and next-30-day planning require a later read, particularly on a phone. The first screen is a spending view of the platform rather than an immediate review workspace.

All visible financial controls are layout previews. The links to comparison files and disclosure controls work locally. No bank, budget, goal, transaction or external split can be changed.
