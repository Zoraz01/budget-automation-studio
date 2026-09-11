# Complete mobile UI specification

Status: design proposal and synthetic interactive prototype. No production UI, accounting, provider, chat database or deployment has changed. The public starter receives the same generic design package as a roadmap; a preview screen does not imply that capability already exists in its runtime.

Open [mobile-concept.html](mobile-concept.html) through a static local server. Use **Coverage map** to find every feature contract, **Preview state** to inspect recovery states, the bottom navigation to explore screens, and the chart information buttons for chart-specific requirements.

## Deliverables

- [Feature-by-feature UI plan](UI-FUNCTIONS.md): all existing page functionality, two API-only capabilities, and explicitly new history/mobile requirements.
- [Chart specification](CHARTS.md): all 12 current visualizations, units, series, interaction, missing data and accessibility.
- [Persistent AI conversation design](CHAT-HISTORY.md): owner-scoped storage, API contract, request lifecycle, retention and acceptance.
- [Home-screen mobile design](MOBILE-WEB-APP.md): layout, keyboard, navigation, lifecycle, installation and measured performance targets.
- [Preview validation and screenshots](VALIDATION.md): checks performed and remaining device gates.
- `catalog.js`: the single feature/chart catalog used by the interactive coverage map and generated specification.

## Information architecture

| Bottom destination | Primary content | Deeper screens |
|---|---|---|
| Home | Monthly flow, review count, budget preview, summary charts and insights | 30-day forecast; paycheck plan; selected chart/activity |
| Review | Focused purchase, edits, explicit approval and batch eligibility | Category split; refund linking; sharing prepare/commit/recovery |
| Activity | Search, active filters, date groups, total and bounded pages | Transaction editor; tags; receipts; linked original/refunds |
| Wealth | Net worth, current worth, debt, account breakdown and history | Assets/liabilities; holdings; debt payoff; retirement assumptions |
| More | Discoverable secondary destinations with full labels | Trends; recurring; budgets; outliers; categories/tags; connections; app settings |

Saved AI conversations are a full-screen destination reached from the consistent header action and More. On a phone the thread owns the screen and composer; desktop may use a wider panel. Every nested screen has an explicit Back action because standalone apps have no browser toolbar.

## Shared presentation rules

Use the current emerald/slate palette, system font, 16px cards, 10px controls and tabular numbers. Give the primary metric visual priority. One primary confirmation action per sheet; destructive actions are separate. Replace cramped tables with summary rows and detail sheets while retaining exact-value tables for charts. Keep text wrapping natural and currency visible. Small accent text uses a contrast-safe emerald tone. Light and system modes remain part of the real implementation.

Loading reserves the final layout; empty explains the prerequisite; error preserves stale data and drafts; stale shows source timestamps; offline blocks model requests and financial writes; session expiry clears the visible sensitive surface and asks for sign-in. These shared modes are selectable in the prototype. Feature contracts add their own specific recovery rules; not every API failure is simulated by the global selector.

## Prototype interaction scope

Working: navigation across 19 screens; 12 rendered chart examples with exact data and point/category selection; forecast spending toggle; buffer/savings scenario arithmetic; conversation create/send/search/rename/pin/archive/restore/delete with local reload persistence; amount masking; dark/light/system preview; split-total validation; sheets and shared-expense state walkthroughs; coverage search; global recovery states.

Form Save, account/provider operations, approval, file upload, and most financial scenario calculations are explicitly **previews**. They do not write financial records. Reporting-period controls demonstrate selection but keep labeled synthetic fixtures; charts are representative samples rather than reconciled production datasets. No LLM is called. No production chat history is implemented by this design task. The real implementation must apply the contracts and backend calculations rather than reuse the illustrative series.

Demo conversation messages are stored under a namespaced browser key. They are local to that browser/origin and may be cleared by the browser. No input is inserted into the source repository. Do not put real account details into a public/shared demo. The production design uses authenticated server storage instead.

## Implementation sequence

1. Preserve existing accounting tests; implement semantic tokens, mobile navigation, route state and baseline shell behind a local feature flag. Port the generic shell to the starter in the same session.
2. Deliver server-side conversations and durable generation jobs with ownership/retry tests, then connect the mobile library and thread. Public adapter keeps its restricted aggregate context.
3. Rebuild Home and all 12 visualizations using the chart contracts and current API data; verify drilldowns and accounting invariants.
4. Rebuild Review/Activity sheets, attachments, refunds and sharing flows; pair the public generic provider interfaces and synthetic tests.
5. Complete Wealth, organization, settings and standalone lifecycle, then run the mobile device/performance matrix. Production rollout is separate from a design commit.

## Acceptance boundary

The coverage catalog is a plan, not an implementation checklist marked complete. Real chat persistence, keyboard behavior, OS memory eviction, cross-device restoration, accessibility and performance require the tests in the linked specifications. A desktop mobile viewport does not prove iPhone/Android home-screen acceptance.

## Run the design preview

From this repository, run:

```sh
python3 -m http.server 4311 --bind 127.0.0.1 --directory docs/design
```

Then open http://127.0.0.1:4311/mobile-concept.html in a desktop browser. This serves invented static design fixtures without the application server, provider credentials or a database. A phone needs its own reachable HTTPS deployment; this loopback URL is not a phone installation link.
