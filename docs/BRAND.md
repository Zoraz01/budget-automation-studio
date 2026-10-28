# BAS — Budget Automation Studio

BAS is pronounced “bass,” like the fish. Keep the established name, original emerald fish and emerald/slate product palette. Primary line: **Find your financial flow.** Supporting line: **Your budget. Your connections. Your code.**

## Positioning

An open-source, local-first budget studio for people who want a useful financial workflow they can adapt. Lead with monthly budgets, transaction review and optional connections. Demo uses invented data. This is a self-hosted starter, not a managed financial service or an advice product.

## Reusable kit

- Original symbol: `web/logo.svg`; unchanged install icons in `web/icons/`.
- Product page: `docs/site/index.html`.
- Visual guide: `docs/site/brand.html`.
- Horizontal lockup: `docs/site/assets/wordmark.svg` (editable system-font text).
- Social composition: `docs/site/assets/social.svg` (1200 × 630 vector master).
- Canonical site tokens and responsive styles: `docs/site/styles.css`.

The site symbol copy is byte-identical to the original fish. Use the fish at least 24px tall, preserve its proportions, and leave one quarter of its width clear around it. Do not redraw or recolor it. Existing home-screen PNGs remain unchanged. Export a reviewed PNG/JPEG from the social master if a destination requires raster media; SVG support varies. No raster upload or platform metadata is configured by this kit.

## Color, type and components

Ink `#0a0d12`, panel `#12161d`, surface `#161b23`, border `#232a35`, text `#eef2f7`, muted `#9aa6b6`, emerald `#10b981`, mint `#6ee7b7`. Emerald filled actions use ink text; small accent text on dark backgrounds uses mint. Do not use color alone for financial meaning. System UI typography needs no font download. Use tabular financial numbers, a 1.6 reading line height, 16px cards, 10px controls, visible keyboard focus and 44px targets. Respect reduced motion.

Use the full name at first mention; BAS in compact headers. Prefer concrete, calm language: “Review this month’s transactions.” Explain enabled provider data flows. Avoid absolute security/privacy promises, invented traction, guaranteed savings or implied financial advice.

## Preview and publication

```sh
npm ci
npm run preview:site
# Product: http://127.0.0.1:4311/
# Brand: http://127.0.0.1:4311/brand.html
```

The preview server binds to loopback, serves only HTML/CSS/SVG from `docs/site`, and does not load a database or environment file. Stop it with Ctrl-C. Run `npm start` separately for the actual synthetic demo on port 4310. The product-page dashboard is labeled illustrative, with income 4,800, expenses 2,640, net cash flow 2,160 and 560 remaining in a 3,200 monthly plan. These numbers were invented for this layout and are not account balances or production screenshots.

The portable static artifact is built with `npm run build:site` into ignored `.site-dist/`, using an exact reviewed file list. Only marketing HTML/CSS/SVG, four reviewed synthetic screenshots and response headers are included. No application code, database, environment or provider configuration enters this artifact.

Cloudflare preview publishing uses pinned Wrangler 4.154.0: sign into the intended existing account with `npx wrangler login`, verify it with `npx wrangler whoami`, export its `CLOUDFLARE_ACCOUNT_ID` without committing the value, then run `npm run deploy:site -- --approved-preview`. The guard rejects domain routes and extra bindings. This publishes the static product site, not the finance app. Validate the returned HTTPS URL with `npm run health:site -- <url>`. The preview has noindex/security headers and a branded 404. A final custom BAS domain remains a separate choice.

Before updating, save `npx wrangler deployments list --json` privately and record the source revision and new version from deployment output. Restore a recorded version with `npx wrangler rollback <version-id>` in the same verified account, then rerun health checks. Keep logs and account IDs in ignored `.private/` or secure operator storage. Company links currently target the working company preview until its domain is launched.

The app entrance and compact wordmark use the same voice and type hierarchy. This identity work adds no financial features. The personal companion retains its own name; see `FEATURE-PARITY.md` for the assessment.

## Applied product polish

The app entrance now has an identity/story panel and a clearly labeled demo or personal sign-in panel. Home, Activity and Budgets share a more consistent hierarchy, tabular figures and readable search controls. Financial calculations, provider behavior and authentication are unchanged. The product tour uses four unmodified native browser JPEG captures from an isolated synthetic demo; screenshots were visually reviewed before publication. The hero panel remains an explicitly illustrative composition. No screenshot of a real account was used.

## Verified static preview

The static product site is at <https://budget-automation-studio.zorazhaseeb1.workers.dev/>. Its initial source is `0e7b18c`, Cloudflare version `b75663a9-af96-4221-bf5d-60bafdec1e42`. HTTPS health checks pass for the page, guide, fish and all four screenshots; private environment, app API and unknown paths return 404. Security/noindex headers are verified. Cloudflare canonicalizes flat `.html` URLs to their extensionless equivalents; the health command checks that redirect remains on the same origin.

The owner requested applying this brand release. The source release is delivered through the public PR/main workflow; no adopter’s finance instance or private companion runtime is deployed by it.
