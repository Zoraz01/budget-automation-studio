# Persistent AI conversations

Status: production implementation specification; the design preview implements only browser-local demo history and deterministic replies. No live model, chat database or server endpoint has been changed.

## Current gap and intended behavior

The personal UI keeps its thread in sessionStorage and sends a trimmed history to a stateless ask endpoint. A page session can survive reload but is not durable cross-session or cross-device storage. The public assistant currently keeps messages in tab memory. Neither is the intended home-screen experience.

The new default is **save conversations on the authenticated server until the user deletes them**. Closing the panel, backgrounding the app, losing connectivity, reopening from its icon or switching to another authorized device must not lose completed messages. Conversation persistence and the amount of history sent to the model are separate decisions.

## Screen and interaction contract

| Surface | Contents and actions | Recovery |
|---|---|---|
| Library | Title, last updated, short preview, pinned group, search, archived filter, new conversation | Skeleton rows; no-history onboarding; failed load retry; keep active selection |
| Thread | Title, timestamp separators, user/assistant roles, period/filter context, evidence disclosures, jump-to-latest | Keep reading position when earlier history loads; append response without stealing focus |
| Composer | Labeled 16px growing textarea, Send, draft, waiting indicator; Enter behavior appropriate to touch versus hardware keyboard | Do not autofocus on entry or after every response; preserve keyboard and draft during errors |
| Evidence | As-of date, selected period, calculation/query description, optional raw SQL disclosure for advanced users | Treat old answers as historical; provide “Ask again with current data,” never silently replace old evidence |
| Management | Rename, pin/unpin, archive/restore, delete, retention setting, clear history | Confirm destructive actions with count/title; visible saved/failed state |
| Generation | Queued, running, completed, failed, interrupted/unknown, cancelled-view | “Stop waiting” does not imply provider cancellation or avoided charges; durable job remains inspectable |

Thread is a full-height mobile route with a separate scroll region for messages. Hide the bottom tab bar while the composer needs the keyboard space; retain an explicit Conversations back button. Desktop can use a side panel with the same underlying route/state. Hardware Escape closes a sheet, not the entire conversation. Native dialogs or a tested focus-trap primitive restore focus.

## Proposed data model

Use the existing server database migration mechanism, applied only as a separate authorized implementation/deployment step. No migration is supplied or run by this preview.

- **conversations**: opaque id, owner/workspace id, encrypted title, created/updated timestamps, pinned_at, archived_at, retention policy, revision.
- **messages**: opaque id, conversation id, owner id, ordinal, role, encrypted content, encrypted evidence, context_as_of, created_at, generation_job_id. Unique conversation/ordinal and foreign keys.
- **generation_jobs**: opaque id, conversation id, owner id, client_request_id, canonical request hash, expected conversation revision, state, created/started/completed timestamps, provider request reference if available, usage counters, error code. Unique owner/client_request_id.
- **conversation_preferences**: owner id, retain-until-deleted default or chosen 30/90/365-day policy, whether drafts persist on server.

Message content, titles and evidence are sensitive. Encrypt content with a server-held key separate from the database and backups; bind associated data to owner, conversation and message identity. Include a key version and rotation/recovery plan. Encryption does not replace authentication or prevent a compromised running server from accessing its authorized plaintext. Do not put provider secrets into these tables. Index metadata, and implement bounded owner-scoped search without a global plaintext transcript index.

## Proposed API contract

Every endpoint resolves owner/workspace from the authenticated session, never a user-supplied owner id. Existing single-owner deployments retain their owner restriction; public single-workspace deployments do not accidentally become multi-tenant.

| Operation | Proposed route | Contract |
|---|---|---|
| List / search | GET /api/conversations?cursor=&q=&archived= | Stable cursor pagination, owner-scoped, bounded results |
| Create | POST /api/conversations | Idempotent creation, returns id/revision |
| Read thread | GET /api/conversations/:id/messages?before= | Paginated messages plus running job; not an unbounded transcript |
| Rename / pin / archive | PATCH /api/conversations/:id | Validate fields; revision check; conflict response preserves draft |
| Send | POST /api/conversations/:id/messages | clientRequestId, expectedRevision, content and approved context; returns persisted message and job id |
| Resume | GET /api/conversations/:id/jobs/:jobId | Durable status/result; polling or reconnectable stream can consume the same job |
| Delete | DELETE /api/conversations/:id | Ownership verified; running-job policy below; all associated active content removed |
| Retention | GET/PATCH /api/conversation-preferences | Explicit choice and effective date; preview affected count before destructive policy change |

All responses containing history use no-store. Cookie deployments apply same-origin/CSRF protections to writes. Clamp message length, page size and search complexity. Reject invalid role/content and reject an idempotency key reused with different content. Do not trust a client-submitted assistant history as the canonical server conversation.

## Durable request lifecycle

1. In one transaction, validate ownership and expected conversation revision; persist the user message and queued job with request hash. Return the same job when the same client request is retried.
2. Acquire an execution lease with compare-and-swap and enforce bounded per-owner concurrency. The worker loads authorized history, builds bounded context and invokes the configured read-only assistant.
3. Persist the assistant message, evidence, usage and completed job atomically. A reconnect reads the completed job without generating another answer.
4. Mobile suspension may drop the connection; it must not cancel the server job merely because the UI disappears. On foreground, request that job's status before sending anything new.
5. If the server restarts after a provider call but before saving the result, mark the expired lease **interrupted/unknown**. Do not claim exactly-once billing: use a provider-supported idempotency/retrieval mechanism where available; otherwise require an explicit retry warning that another request may run. Never automatically issue duplicate paid work.
6. Failed validation creates no model call. Transient transport errors after acceptance remain a recoverable job state. A user retry creates a new request only when the prior outcome is resolved or explicitly acknowledged.

Deleting a conversation while generation is running marks it deleted/tombstoned immediately for authorization and result delivery; a finishing job must not recreate or expose its content. Purge active message content after the running worker releases it, with a bounded cleanup job. Retain only minimal non-content request metadata needed to prevent replay during the retry window. Define physical database free-page/WAL cleanup and backup expiry in deployment documentation; do not promise immediate forensic erasure of all old backups.

## Context and costs

Load recent server messages within an explicit token budget. Older messages remain browsable even when excluded from a model request. If summarization is introduced, version and label it; preserve original messages, identify the summary boundary, and re-check permissions on every tool call. Evidence and imported text are untrusted data, not instructions. The public adapter keeps its aggregate-only context unless an adopter explicitly changes that scope; sharing UI capability does not mean exporting personal prompts or SQL tools.

History retention must not create unbounded model spending: bounded owner concurrency, request deduplication, configurable token limits and metadata-only usage logs. Remove the current question-preview logging when implementing durable history; log job ids, status, latency and usage without conversation contents or raw provider responses.

## Retention, auth and offline policy

Default retain-until-deleted satisfies the request to keep history. Archive only changes visibility. Optional automatic retention clearly says which messages will be removed and when. Sign-out removes sensitive client memory and persisted local drafts; server history remains behind authentication. The prototype's localStorage model is intentionally not the production storage strategy.

Do not cache transcripts, attachments or financial API responses in a service worker. Initial offline support is an app-shell explanation and retry action, not an offline financial write queue. Optional persistent drafts belong in an owner-scoped server store or an explicitly opted-in encrypted local store with a clear unlock/expiry model. Do not assume the browser's storage will survive OS eviction.

## Required tests before release

- Completed history survives reload, tab close, process restart and a fresh authorized session/device.
- A second owner cannot list, search, read, edit, delete or resume the first owner's conversation or jobs; use explicit negative authorization tests.
- Same request/key returns one persisted job; same key/different body conflicts; simultaneous sends cannot reorder messages.
- Suspend/resume and network loss do not lose a completed answer or resend paid work; crash after provider acceptance becomes unknown rather than automatic regeneration.
- Rename/archive/restore/delete/retention work with failed requests and running jobs. Deleted conversations are not recreated by a late response.
- Evidence retains its original as-of date and scope; model-context truncation does not delete browsable history.
- Auth expiry clears visible private content, successful re-auth restores the intended conversation, sign-out clears local caches, and history requests are no-store.
- Composer remains above a real iPhone/Android keyboard in standalone mode; focus is not stolen after generation; draft survives a recoverable failure.
- Encryption key rotation and database restore recover authorized history; logs, public fixtures and screenshots contain no personal conversation data.
