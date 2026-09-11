# HTTP API

All endpoints are same-origin and local to `http://127.0.0.1:4310` by default. JSON requests are limited to 8 KiB. Dates use `YYYY-MM-DD`; months use `YYYY-MM`. Money in responses is integer cents. Manual-entry and budget requests accept decimal **strings** with at most two fractional digits.

`POST`, `PUT` and `PATCH` require `Content-Type: application/json` and an `Origin` header exactly equal to the configured loopback origin. Except for session-mode inspection and login, API requests require the `budget_session` cookie issued by login. This is a single-workspace API, not an authentication bypass for server-to-server clients.

| Method | Route | Request | Result |
| --- | --- | --- | --- |
| GET | `/api/session` | None | Current mode only |
| POST | `/api/login` | `{ "password": "…" }` | HttpOnly session cookie |
| POST | `/api/logout` | `{}` | Session invalidated |
| GET | `/api/state?month=2026-05` | None | Budget summary, categories, selected-month transactions, investment observations and sanitized connection status |
| PUT | `/api/budgets` | `{ "month": "2026-05", "category_id": "food", "amount": "450.00" }` | Monthly limit saved |
| POST | `/api/categories` | `{ "name": "Travel" }` | New expense category ID |
| POST | `/api/transactions` | `{ "date": "2026-05-03", "description": "Groceries", "amount": "45.29", "category_id": "food" }` | New manual transaction ID |
| PATCH | `/api/transactions/category` | `{ "id": "…", "category_id": "food" }` | Category saved and marked reviewed |
| POST | `/api/chat` | `{ "month": "2026-05", "question": "How much budget is left?" }` | `{ "mode": "summary or ollama", "answer": "…" }` |
| POST | `/api/providers/plaid/link` | `{}` | Short-lived `link_token` |
| POST | `/api/providers/plaid/exchange` | `{ "public_token": "…" }` | Access token stored encrypted; no secret in response |
| POST | `/api/providers/plaid/sync` | `{ "id": "connection ID from state" }` | Page and change counts |
| POST | `/api/providers/snaptrade/connect` | `{}` | HTTPS read-only connection portal URL |
| POST | `/api/providers/snaptrade/sync` | `{}` | Imported account count |

Provider endpoints require personal mode and configured credentials. No trade, arbitrary SQL, file-upload or credential-read endpoint exists. The current API supports creating transactions and changing categories; editing/deleting posted amounts and destructive connection removal are intentionally not implemented in v0.1.

Sessions last up to eight hours and are invalidated on server restart. Ten failed login attempts trigger a ten-minute process-local throttle. Provider operations have a three-second per-provider cooldown; chat has a 1.5-second request cooldown. Provider/AI work is serialized. The client is expected to display validation and availability errors and allow explicit retries, not repeatedly poll in a tight loop.

Errors use `{ "error": "human-readable message" }`. Status codes include 400 for validation/configuration, 401 for authentication, 403 for Host/Origin rejection, 404 for unknown routes, 405 for unsupported methods, 429 for rate limiting and 502 for provider or operation failures. Raw SDK responses and request configuration are never returned in error bodies.

## Example data contract

A transaction returned by `/api/state`:

```json
{
  "id": "synthetic-example-id",
  "source": "manual",
  "date": "2026-05-03",
  "description": "Example grocery trip",
  "amount_cents": 4529,
  "currency": "USD",
  "category_id": "food",
  "pending": 0,
  "reviewed": 1
}
```

The selected-month response currently returns all matching transactions without pagination. Add server pagination, indexes and bounded query plans before supporting large histories or a shared hosted deployment. Do not expose this API directly to untrusted network clients.
