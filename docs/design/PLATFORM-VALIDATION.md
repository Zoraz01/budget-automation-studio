# Platform study validation

Checked 2026-11-14. These are design and source checks, not production or physical-phone acceptance.

## Evidence

- Three authored Home directions render in both repositories at 320, 390, 768 and 1440px: 24 page/viewport checks, with no page errors, document overflow or undersized interactive links/disclosures. The three concepts share the same shell within each repository. At phone widths A uses one full-width metric followed by two compact measures so its review action appears sooner.
- Desktop and phone before/after boards use actual browser captures. The personal baseline came from an isolated frontend build with an explicit empty Vite environment directory and fixture-only API. Its production backend was never started. BAS used its own independent demo process, temporary database and explicit demo configuration, with no personal environment file or provider credentials loaded. Both baseline renders had no page errors.
- All amounts, account labels and merchant names in the concept source are newly invented. The BAS baseline uses its own invented seed data, so its amounts intentionally differ from the generic concepts. Review the arrangement rather than comparing amounts across that baseline. No live-account screenshot or private runtime export is included.
- Reviewed fixture arithmetic: $6,400 income − $2,850 spending − $1,200 savings deposits = $2,350 liquid cash flow; $4,000 budget − $2,850 spending = $1,150 budget remaining; $68,000 assets − $12,000 liabilities = $56,000 net worth. Checking $8,420 + savings $9,580 + investments $50,000 = $68,000 assets. Goal reservations are not additional assets.
- The planning fixture uses $8,420 checking, $1,800 bills over 30 days, $30/day variable spending, $1,400 reserves and $200 buffer. Its low projected checking balance is $5,720; headroom after reserves/buffer is $4,120. Bills are $180 on Nov 18, $1,500 on Dec 1 and $120 on Dec 14. It assumes no future pay. Estimated 7/14/30-day bills are $180/$180/$1,800. These are illustrative inputs, not financial advice or verified obligations.
- The baseline frontend production build passed into temporary output, leaving the served asset directory untouched. BAS's 98 regression tests passed. Both copies of the new capture script are syntax-checked and exercised independently. Public formatting, release allowlist, staged credential scan and Gitleaks checks are recorded with the design branch before publication; they do not establish live-provider acceptance.
- The public production dependency advisory check found an existing high-severity `follow-redirects` advisory, [GHSA-mrwp-f3q8-3g9p](https://github.com/advisories/GHSA-mrwp-f3q8-3g9p). Dependency manifests/lockfiles are unchanged by this design-only branch. This finding remains open for a separately scoped dependency repair; this branch is not a finance-runtime release.

## Open the concepts

From either repository root:

```sh
python3 -m http.server 4400 --bind 127.0.0.1 --directory docs/design
```

Open `http://127.0.0.1:4400/platform-directions.html` for the desktop board or `http://127.0.0.1:4400/platform-directions-mobile.html` for the phone board. Open `platform-a.html`, `platform-b.html` or `platform-c.html` on that origin to inspect the source-sized page. Stop this owned preview server with Ctrl+C. The boards embed their captures and also open as standalone files.

The static server serves design documents only. It does not load application environment files, authenticate to a bank, write a financial record or call an AI provider. A desktop loopback address is not reachable from a separate phone.

## Reproduce layout checks

The optional browser tool stays outside runtime dependencies. If Playwright is already installed, point `PLAYWRIGHT_MODULE` at its ESM entry file, or leave it unset when the package resolves locally. For a separate temporary installation:

```sh
capture_tools="$(mktemp -d)"
npm install --prefix "$capture_tools" --no-package-lock playwright
"$capture_tools/node_modules/.bin/playwright" install chromium
PLAYWRIGHT_MODULE="$capture_tools/node_modules/playwright/index.mjs" \
  node scripts/capture-platform-design.mjs
```

The script starts its own loopback server on a free port, serves only design HTML/CSS/JPEG files, blocks all other browser requests, checks the three concepts at all four widths, and closes its browser/server in `finally`. It writes captures and `layout-checks.json` to a new temporary folder printed on completion. Set `DESIGN_CAPTURE_DIR` only when intentionally choosing another output folder. It does not overwrite reviewed repository screenshots by default.

The checked-in baseline captures are evidence of the current source on this date. Reproducing a future baseline requires an independently isolated synthetic runtime/build again; the static capture command regenerates the concepts, not application baselines. No private baseline harness, environment or database is needed to use the design package.

## Remaining acceptance

Only Home directions are visually rendered here. Other destinations have a feature-by-feature specification in [the platform proposal](PLATFORM-OVERHAUL.md), not finished designs or implemented screens. Static controls communicate layout only; they do not edit records. Native disclosures expose exact values.

No claimed improvement in task completion, conversion or other behavior has been measured. Loading, empty, stale, offline, error and authentication states must be rendered during implementation. Test all existing accounting rules, provider permissions, mutation recovery and chart interactions when real screens change. Phone Home Screen installation, keyboard behavior, screen-reader journeys and physical iPhone/Android acceptance remain open. Source publication is separate from deployment.
