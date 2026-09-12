# Saved conversations

Open the assistant and choose **Conversations** to reopen a thread, or **New chat** to start another. Conversations are saved on the server by default until you delete them. Closing a panel, reloading, signing out or restarting the server does not remove completed messages. Sign in to the same server to access them again.

Use **Manage conversation** to rename, pin, archive/restore or delete a thread. Archive hides a conversation from the active list; it keeps its messages. Delete requires confirmation and prevents an in-flight reply from recreating the thread. Historical replies keep their original timestamps and evidence; they do not automatically refresh with your current finances.

Questions are committed before generation starts. A repeated request ID returns the existing job; conflicting reuse is rejected. One generation runs at a time. Reopening the thread reads its status without sending another model request. Work interrupted by a process restart is marked interrupted, never automatically replayed. **Ask again** is an explicit new request and can incur another provider charge.

## Storage, recovery and limits

Titles, questions, answers and evidence use AES-256-GCM with authenticated owner/thread/turn identifiers and a versioned `v1` envelope. Metadata (IDs, timestamps, state and request hashes) remains unencrypted. Authentication is still required: encryption does not protect against a compromised running server. History responses are `no-store`; transcripts are not cached by a service worker or written to browser storage.

Keep an online SQLite backup (SQLite backup API), or stop the app before copying its database. A live database copy without its journal can be incomplete. Back up the encryption key separately in secure storage. Restore the database and its matching key together to an isolated instance, verify readable conversations, then restore service. Never replace current financial data with an old backup just to roll back a UI change. Key loss makes encrypted history unrecoverable. There is no automatic key rotation tool yet; do not replace a key on an existing store.

Deletion removes active rows; old database pages, WAL files and backups can retain encrypted content. It does not promise forensic deletion of old backups. Apply your own backup expiration policy. Run one server process per database; multi-process worker leases are not implemented.

The list and thread load 30 conversations/turns per page, with controls to read earlier pages. Drafts are temporary client memory; closing/reloading can discard unsent text. Existing tab-only chats are not automatically imported, and already-lost sessions cannot be recovered. Full-text search, retention schedules, automatic key rotation, conversation URLs and legacy transcript import remain follow-up items from the broader design specification. Physical iPhone/Android keyboard and home-screen acceptance remain separate from browser viewport checks.

## BAS setup

Run the existing setup/start commands in the README. History tables are added automatically to the local workspace SQLite database. Personal mode uses the existing server-side `VAULT_KEY`; keep it with your secure configuration backup. Demo startup creates `data/demo.sqlite.chat-key` with owner-only permissions so invented conversations survive restarting the demo. Never publish the data directory or its keys. A wrong key fails closed when an existing encrypted title is read.

The API lives at `/api/conversations`; read/update use `/:id`, send uses `/:id/messages`, and confirmed deletion posts to `/:id/delete`. All routes use the existing password session and same-origin write protections. This is a single-workspace server: all people sharing its password share history. Multi-user isolation and public internet hosting are not implied.

The adapter keeps its aggregate-only boundary: it receives the new question and that selected month's budget summary, not merchant/account rows or earlier chat messages. Earlier messages remain readable in the UI. Question length is limited to 1,200 characters. Deterministic summaries work without any model; optional Ollama remains local and has a 45-second timeout. Each saved turn records its budget month.
