# Security model

This is a local, single-workspace starter. It has deliberate protective defaults, but it is not a security audit, a hosted banking product or a claim that no compromise is possible.

## Implemented boundaries

- Bind only to `127.0.0.1`, with exact Host and write-Origin validation. No public bind toggle or permissive CORS setting.
- Separate synthetic demo and personal databases. Demo mode disables provider and AI operations even when keys exist in the process environment.
- Fresh random personal password and encryption key generated only inside this repository. No reads from another app's settings, credential directory, database or home-server paths.
- Random process-local sessions with HttpOnly/SameSite Strict cookies, expiry, logout, bounded session count and login throttling. Cookies are not marked Secure because the supported listener is local HTTP; HTTPS deployments must change this together with origin and proxy handling.
- AES-256-GCM encryption for stored provider credentials with authenticated per-connection context. Access tokens and Commercial user secrets are excluded from API state and errors.
- Parameterized SQLite queries and a fixed static-file allowlist. `.env`, databases, logs and source files are never served.
- Request size validation, finite provider deadlines, serial provider/AI operations and cooldowns.
- No caching of application responses, restrictive CSP, frame embedding denied, no analytics, no telemetry or remote fonts. The Plaid script is loaded only when the user explicitly begins connection.
- Chat receives allowlisted aggregates and has no SQL, shell, file, credential, transaction-write or trading tools. Model output is escaped text.
- Release allowlist, secret-pattern checks, pinned direct SDK version, lockfile, tests and CI dependency auditing.

## What these controls do not provide

The SQLite database stores readable transaction descriptions and amounts. It is **not fully encrypted**. The encryption key and provider configuration live in a local `.env`; a compromised OS user who can read both data and keys can decrypt tokens. Use full-disk encryption, OS account protection and encrypted backups. Unix file modes reduce accidental access, but Windows access control and privileged administrators are outside this protection.

Loopback is not an isolation boundary against malicious local software, browser extensions or a stolen session. Auth and rate limits are process-local and designed for one trusted operator. A public tunnel or proxy is outside the supported deployment model. Do not expose the starter unchanged to the internet.

A local Ollama endpoint is controlled by its operator. This app rejects cloud-labeled model names, but the Ollama service must separately be configured for local-only execution. Category names, totals and the question are financial data; keep this in mind when adding any AI provider.

A read-only connection request does not reduce permissions of a separate, previously created provider key. Keep your provider account scoped appropriately. Sync tests are mocked, and no live financial provider was used to validate this release.

Automated content scanning catches known patterns, not every secret, private identifier, proprietary passage or sensitive screenshot. Human review remains necessary for public releases. If a secret was previously exposed elsewhere, removing it from this repository cannot revoke that exposure; rotate it through the provider.

## Report a vulnerability

Use this repository's **Security → Report a vulnerability** private advisory flow when available. If unavailable, open a minimal issue requesting a private reporting channel without exploit details or sensitive data. Never attach `.env`, database files, provider tokens, personal account screenshots or unredacted SDK errors to a public issue.

Only the latest published release is supported on a best-effort basis. There is no promised response-time SLA.
