# Project instructions

Build a polished, documented product. Keep setup, behavior, limitations, and validation evidence accurate.

## Paired repository workflow

The personal application and the public budget automation starter are companion projects. Every new feature, behavior fix, or reusable UI improvement must include a counterpart assessment and a safe public implementation where applicable. Do this in the same work session; do not leave public work as an unmentioned follow-up.

- Sync capabilities and design conventions, not entire repositories or Git histories. Each repository has its own architecture, dependencies, authentication, configuration, and deployment.
- Implement the public equivalent with configurable settings, provider adapters, and invented fixtures. A different implementation is expected when architectures differ.
- Never copy private databases, transaction/merchant/category history, balances, account or contact identifiers, prompts containing personal data, tokens, keys, logs, attachments, screenshots of live accounts, hostnames, machine paths, deployment files, or private commit metadata into the public repository. Renaming real data does not make it synthetic.
- Review every public file and screenshot. Use a separate demo process and database, with no personal environment loaded. Credentials must be supplied by each adopter and remain server-side.
- Preserve financial semantics, explicit confirmation before external writes, freshness states, and error handling. AI suggestions must not silently change financial records.
- Update docs/FEATURE-PARITY.md in both repositories with feature status, the generic adaptation, checks, and any remaining gap. Existing gaps are a backlog, not evidence of parity. For a new exception, explain why it cannot be safely generalized and what remains; do not mark the feature synchronized. Do not silently defer a portable feature.
- Test both affected implementations and their setup guides. Public release requires formatting, tests, release allowlist checks, secret scanning, and manual review for personal data (secret scanners cannot recognize all financial information).
- Commit each repository separately. Verify remote identity and visibility before publishing. Never add the private repository as a public remote, merge its history, or push private commits to the starter.
- Report private/public completion and validation separately. A Git push does not mean production deployment or physical-phone acceptance.

## UI conventions

Mobile first: emerald #10b981, near-black #0a0d12, slate cards #12161d, secondary surfaces #161b23, borders #232a35, text #eef2f7, muted text #9aa6b6. Use the system font, 16px cards, 10px controls, tabular financial numbers, safe-area spacing, visible focus, and at least 44px touch targets. Use #6ee7b7 for small accent text on dark surfaces where stronger contrast is needed. Keep screenshots in dark mode with invented data. Document adding the HTTPS web app to the phone home screen; do not imply a local desktop URL is reachable from a phone.

## This public starter

Run npm test, npm run check:format, and npm run check:release before release. Add intentional new source/documentation paths to the release allowlist when necessary; never broaden it to admit private artifacts. The starter must run with synthetic demo data and no provider credentials. Keep the loopback-only security boundary explicit until secure remote hosting is implemented and validated. Upstream personal infrastructure is not required to contribute or run this repository.

## BAS identity

Use BAS — Budget Automation Studio (pronounced bass), the original fish mark and the shared emerald/slate palette. Canonical repository: `Zoraz01/budget-automation-studio`. The personal companion retains its own name; keep capabilities aligned through the paired workflow.
