# Contributing

Thanks for helping make budgeting software easier to understand and adapt.

1. Fork this repository and work on a focused branch.
2. Install Node 24 and run `npm ci`.
3. Use synthetic fixtures. Never point development or CI at a personal bank account or production database.
4. Run `npm test`, `npm run check:release`, and `npm audit --omit=dev`.
5. Check touched UI flows at desktop and phone viewport widths, including keyboard navigation, error states and empty data.
6. Open a pull request that explains the problem, resulting behavior and validation performed. Clearly identify any live-provider or device behavior that remains untested.

Keep money in integer cents and checkpoint updates atomic with imported data. New providers must include rollback, duplicate, unavailable-data and currency tests. Preserve the explicit provider and AI opt-ins. Do not add machine-specific paths, telemetry, raw transaction logging or credentials to browser code.

For schema changes, include versioned migrations, backup/restore instructions and a rollback strategy. For hosting changes, first document authentication, workspace ownership and threat boundaries. A new environment variable is not a substitute for designing multi-user authorization.

Before publishing screenshots, confirm every account name, amount and transaction description is synthetic. Use [the security reporting process](SECURITY.md) for sensitive findings.

Contributions are submitted under the repository's MIT license. Respect upstream licenses and do not contribute code you do not have the right to share.
