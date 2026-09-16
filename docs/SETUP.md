# Setup guide

## 1. Run the synthetic demo

You need Git and Node.js 24.10+ within the 24.x line. macOS, Linux and Windows are suitable for the local starter. CI runs the regression suite on all three; the original visual review used a macOS browser. Run the commands in the repository directory, not inside another application.

```sh
npm ci
npm start
```

Open `http://127.0.0.1:4310`. The password is `demo`, prefilled for convenience. No external API is called in demo mode, including when provider environment variables exist in your shell. Demo mode is a synthetic local playground: do not enter real personal information into a database protected by the published demo password.

The server binds only to loopback. Use the exact `127.0.0.1` address: `localhost` and alternate Host headers are intentionally rejected. To change the port, set `PORT` in `.env`; 1024–65535 are accepted.

## 2. Create your personal workspace

Stop the server with Ctrl+C. Run:

```sh
npm run setup
```

This creates `.env` with `APP_MODE=personal`, a random login password, and a separate AES encryption key. It refuses to overwrite an existing `.env`. Save the printed password in your password manager and keep `.env` private. Do not paste it into GitHub issues.

Before first personal startup, set `BUDGET_CURRENCY` if needed: `USD`, `CAD`, `EUR`, `GBP`, `AUD`, `NZD`, `CHF`, `SGD`, or `HKD`. These currencies use two decimal places. An existing database rejects a currency change. Separate currencies belong in separate instances; the application never performs FX conversion or silently sums mixed currencies.

Then run `npm start` and sign in with the generated password. Your empty personal workspace is independent of the demo database. In **Budgets**, add categories and set each month's limits. In **Transactions**, add entries:

| Entry | Amount | Category |
| --- | --- | --- |
| Purchase | Positive | An expense category |
| Pay or other income | Negative | Income |
| Refund | Negative | The original expense category |
| Movement between your own accounts | Either direction | Transfers |

Do not classify payments to other people or businesses as transfers simply because a provider used that label. Transfers are excluded from income and spending. Mistaken classification will affect totals.

For planned purchases and long-term funds, open **Goals** from Home. Start with an unfunded wishlist, then set a combined monthly limit, individual contributions, and Funding setup. Confirm the backing cash balance and protected bills/buffer before reserving money. Automatic allocation starts off and requires your explicit choice; it operates only while the server runs. Follow [Goals setup and recovery](GOALS.md), including payment holds and cash freshness. This feature does not move money at your bank.

## 3. Optional Plaid integration

Start with [Plaid Sandbox](https://plaid.com/docs/sandbox/). Use your own application credentials from the Plaid developer dashboard. The starter does not ship shared credentials.

Add to your private `.env`:

```dotenv
PLAID_ENV=sandbox
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_COUNTRY_CODES=US
```

Fill the blank values locally. Restart the server, open **Connections**, and select **Connect a bank**. Complete Plaid Link using the Sandbox credentials described in Plaid's documentation. The public token is exchanged on the server; the resulting access token is encrypted in SQLite. It is never returned to the browser.

Use **Sync data** after connection. The first transaction response may be empty while Plaid prepares data; wait and sync again. Imported non-income entries start as **Uncategorized** and every import requires review. Review categories in **Transactions**, or use **Confirm category** to accept the displayed category. Provider modifications preserve your category but mark changed amounts, dates and descriptions for review again.

The adapter requests only the Transactions product. `/transactions/sync` handles added, modified and removed entries. It does not call `/transactions/refresh`, force institution refreshes, or poll on a schedule. Normal API use may still have provider costs; review your plan.

### Live Plaid

Production is a deliberate configuration choice:

```dotenv
PLAID_ENV=production
ALLOW_LIVE_PLAID=true
```

Use production keys and complete Plaid's required application approval and institution-specific setup. Country availability, OAuth redirects and product eligibility differ. The local Link flow does **not** implement the OAuth redirect-resumption route needed for every OAuth institution. Extend that flow using [Plaid's OAuth documentation](https://plaid.com/docs/link/oauth/) before supporting those institutions in a deployed app. Never solve an OAuth callback problem by bypassing the starter's origin checks or exposing its HTTP server publicly.

To disconnect or revoke access, use the provider dashboard or institution's connected-app settings. This starter does not expose a destructive disconnect/delete-data route. Existing local records remain until you deliberately remove your own database.

## 4. Optional SnapTrade integration

Use your own [SnapTrade developer account](https://docs.snaptrade.com/docs/getting-started) and choose the auth mode that matches the issued keys:

```dotenv
SNAPTRADE_AUTH_MODE=personal
SNAPTRADE_CLIENT_ID=
SNAPTRADE_CONSUMER_KEY=
```

Fill the values locally, restart, and select **Connect investments**. Open the generated HTTPS SnapTrade portal link, finish connecting, then return and select **Sync data**. The portal is explicitly requested with `connectionType: read`. No trading or order endpoints are exposed by the app.

- **Personal** keys identify the account directly. The adapter does not register a user or pass `userId` / `userSecret`.
- **Commercial** keys require `SNAPTRADE_AUTH_MODE=commercial`. The adapter registers one local workspace identity and encrypts its returned user secret. This is still one workspace; Commercial credentials do not make the starter multi-tenant.
- Account values come from the provider response and may be cached. An import timestamp records when this application fetched them, not when the brokerage valued every asset.
- Missing or foreign-currency values display **Unavailable**. Accounts omitted on a later sync, or retained after a failed sync, display **stale** with their previous timestamp and value.

SnapTrade access and cost depend on your account plan. Do not assume its developer connection flow is a free banking sandbox.

If Commercial user registration times out after the provider created the user, the application retains the generated registration ID to avoid creating duplicates. The user secret might not have reached local storage. Recover or remove that specific test registration through SnapTrade support/dashboard before deliberately resetting it locally. Do not repeatedly replace the registration ID.

## 5. Connect your AI provider

After creating your personal workspace, run:

```sh
npm run setup:ai
npm start
```

The wizard asks for a provider, an API key in a hidden prompt, and an optional model override. Press Enter at the model prompt to use the default below. It updates only AI settings in your existing `.env`, preserves the login password/encryption key and other connections, and writes owner-only permissions on Unix. Restart an already-running BAS process after changing settings. Open **Connect** to see the selected provider, then **Ask BAS** to chat. "Configured" means settings are present, not that an API request has verified your account.

| Provider | Default model | Get your own API key |
| --- | --- | --- |
| OpenAI | `gpt-4.1-mini` | [OpenAI API keys](https://platform.openai.com/api-keys) |
| Anthropic | `claude-haiku-4-5` | [Claude Console](https://platform.claude.com/) |
| Google Gemini | `gemini-3.8-flash` | [Google AI Studio](https://aistudio.google.com/apikey) |
| Local Ollama | Enter a downloaded model name | No API key |
| Budget summaries | No model | No API key or network request |

Enable API access, model permissions and any required billing/credits with the selected provider. A consumer chat subscription is not a substitute for API access. Setup itself makes no provider request and incurs no model usage; asking a cloud question can incur charges. Model availability and prices depend on the provider and your account. Defaults can be overridden without code changes.

For manual configuration, edit these settings locally (fill `AI_API_KEY` with your own key; do not publish it):

```dotenv
AI_PROVIDER=openai
AI_API_KEY=
AI_MODEL=
```

Allowed providers are `openai`, `anthropic`, `gemini`, `ollama`, and `disabled`. Leaving `AI_MODEL` blank uses the selected cloud default. As an alternative to `AI_API_KEY`, the selected adapter accepts `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` or `GEMINI_API_KEY`; `AI_API_KEY` takes precedence. Do not mix a provider with another provider's key. Shell environment variables override `.env` in Node: remove conflicting exported AI settings if the wizard's settings appear not to apply. Never put keys in the browser, command-line arguments, screenshots or issues. Switching providers does not delete saved history or revoke old keys at the provider.

### What the model receives

BAS sends your question, selected month, currency, category names, counts and integer-cent totals. It does not supply raw transaction rows, merchant records, account identifiers or banking credentials. Category names and whatever you type can still contain sensitive information. Cloud chat sends this context to the selected provider; its data policies apply. OpenAI requests use `store: false`, which is not a promise of zero provider retention. See [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data), [Anthropic privacy](https://privacy.claude.com/) and [Gemini API terms](https://ai.google.dev/gemini-api/terms).

Adapters use fixed provider endpoints and do not follow redirects. Requests have a 45-second deadline and are never automatically retried. Replies may be inaccurate and cannot write to the application: no SQL, shell, trading, budget-write or arbitrary network tools are granted. There is no automatic background analysis. Questions are independent requests; earlier messages are saved in encrypted server history for reading but are not sent as model context. [History setup and recovery](CHAT-HISTORY.md).

API request formats follow the official [OpenAI Responses guide](https://developers.openai.com/api/docs/guides/text), [Anthropic Messages API](https://platform.claude.com/docs/en/api/http/messages/create) and [Gemini generateContent guide](https://ai.google.dev/gemini-api/docs/generate-content/get-started). Tests use synthetic mocked responses; live provider-account acceptance is not established by these tests.

### Local Ollama or no AI

For local execution, install [Ollama](https://docs.ollama.com/) and download a model suited to your hardware. Run `npm run setup:ai`, choose Ollama and enter the exact model name from `ollama list`. Existing `AI_PROVIDER=ollama` plus `OLLAMA_MODEL` settings also work; `AI_MODEL` takes precedence. The adapter calls only `http://127.0.0.1:11434/api/chat`.

Choose a locally running model, not a cloud model. Disable cloud features with `OLLAMA_NO_CLOUD=1` in the **Ollama service's** environment and restart Ollama. Setting it only in BAS's `.env` does not configure that separate process. Cloud-labeled model names are rejected, but the operator controls how Ollama executes requests.

Choose **Budget summaries** in the wizard, or set `AI_PROVIDER=disabled`, to use deterministic summaries without AI. Demo mode always uses this mode, even when API keys exist in the environment.

## 6. Back up, restore, and update

The default paths are relative to the repository:

```text
.env                  # Authentication, encryption key and your provider settings
data/demo.sqlite     # Synthetic demo data
data/personal.sqlite # Your personal records and encrypted provider tokens
```

Stop the application before copying `.env` and the entire `data/` directory to an encrypted backup location. Copying just a live SQLite file can miss its write-ahead log. Restore both settings and data before starting the same release. Protect the encryption key separately where practical; losing it makes stored provider tokens unreadable. The database contains readable financial records even though provider tokens are encrypted. Use full-disk encryption and protect backups.

To update, stop the server, back up your data, review release notes, pull the new version and run `npm ci`. Version 0.1 initializes schema version 1; future schema changes require explicit versioned migrations and upgrade instructions. No downgrade or live migration mechanism is shipped in this release.

Reset a forgotten local login password by editing only `APP_PASSWORD` in `.env` to a new long random value and restarting. Do not change `VAULT_KEY` as part of a login-password reset. Restart invalidates all browser sessions. Provider-key rotation and vault-key migration are separate operations; there is no in-place vault re-encryption tool in this starter.

## 7. Add the web app to your phone

The entire interface uses a dark, mobile-first layout with bottom navigation, touch-friendly controls and safe-area spacing. A web app manifest and app icons let supporting browsers launch it in a standalone window from your Home Screen. You do not need an App Store or Play Store download.

### First, use a phone-accessible HTTPS address

Installation starts from **your running web app**, not this GitHub repository. Open the HTTPS address of your own securely deployed instance on your phone. The default `127.0.0.1:4310` address works only on the computer running the starter; entering it on a phone points to the phone itself. This repository does not include a ready-made remote deployment. Complete the secure deployment work below before using personal data remotely.

### iPhone or iPad — Safari

1. Open your deployed web app in **Safari** and sign in.
2. Tap **Share**. Depending on Safari's layout, Share may be inside the browser menu.
3. Choose **Add to Home Screen**. If it is hidden, use **Edit Actions** to add it to the share sheet.
4. Keep **Open as Web App** enabled when that option appears.
5. Use the name **BAS**, then tap **Add**.
6. Launch the new budget icon from your Home Screen. Sign in again if prompted.

These steps follow [Apple's Home Screen web app guide](https://support.apple.com/en-kw/guide/iphone/iphea86e5236/ios). Names and menu locations can vary by OS version.

### Android — Chrome

1. Open your deployed web app in **Chrome** and sign in.
2. Tap the **three-dot menu** beside the address bar.
3. Select **Install and create shortcut → Install**, or **Add to Home screen → Install**, depending on the Chrome version.
4. Confirm the installation, then open **BAS** from your Home Screen or app drawer.

See [Google's web app installation guide](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en). If only a shortcut is offered, verify HTTPS and the manifest/icon responses; browser install eligibility varies. A shortcut can open in a browser tab rather than a standalone window.

### How the installed app behaves

The app requests standalone display, includes 192px/512px maskable-compatible icons and a 180px Apple touch icon, and uses a dark launch background. It keeps the same login and server-backed data. Adding the icon does not move the backend onto your phone or keep it running when the host computer is off.

**Online connection required:** this release has no service worker or offline cache. Financial pages and API responses remain `no-store`; no new financial-data cache is introduced for installation. No push notifications or background sync are added. The manifest and icon assets are verified by HTTP tests; physical-device installation has not been verified.

### Secure deployment work before remote use

For remote access, design a separate hardened deployment with TLS, managed authentication, secure cookies, explicit trusted proxy/origin handling, a secret manager, durable backups, rate limiting and monitoring. A service for multiple people additionally needs per-user ownership and authorization enforced on every database query, plus OAuth callback and verified-webhook handling. Sharing this local server as-is over a public tunnel is unsupported. Friends can each clone it and run an isolated personal instance with their own keys.

## Troubleshooting

| Symptom | Next step |
| --- | --- |
| `node:sqlite` unavailable | Check `node --version`; use the supported Node 24 line |
| SQLite experimental warning | Expected from the Node API; tests cover the interfaces this project uses |
| Port unavailable | Stop your previous starter process or choose another unused `PORT`; do not stop unrelated services |
| `.env already exists` | Inspect and edit your existing settings; setup refuses to replace keys |
| Blank personal dashboard | Expected initially; select the correct month, add entries or sync a connection |
| Provider button disabled | Check personal mode, both provider keys, and restart after changing `.env` |
| Origin rejected | Open the exact `http://127.0.0.1:PORT` URL, not an alias or public proxy |
| Provider operation cannot finish | Check correct account type, key environment, provider availability and whether connection authorization expired |
| Currency mismatch | Use a matching-currency workspace; the entire Plaid batch remains uncommitted |
| AI setup incomplete | Run `npm run setup:ai`, choose the matching provider/key and restart; check for conflicting shell variables |
| AI access rejected | Check key validity, provider selection and API model permissions; restart after rotating the key |
| AI limit reached | Check provider API billing, credits and rate limits before explicitly retrying |
| AI model unavailable | Check `AI_MODEL` against models available to your API account |
| AI cannot be reached | Check server connectivity/provider status; for Ollama, check that it is running and the model is downloaded. Deadline: 45 seconds |
| Too many login attempts | Wait ten minutes before retrying |
