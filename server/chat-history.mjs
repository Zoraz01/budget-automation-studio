// Portable, encrypted conversation storage. Caller supplies its authenticated owner.
import {
  randomUUID,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";
export class HistoryError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export function historyStore(db, key) {
  if (!/^[a-f0-9]{64}$/i.test(key || ""))
    throw new Error("A 32-byte chat encryption key is required");
  db.exec(`CREATE TABLE IF NOT EXISTS chat_threads (
    id TEXT PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0,
    pinned INTEGER NOT NULL DEFAULT 0, archived INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS chat_owner ON chat_threads(owner,updated_at,id);
    CREATE TABLE IF NOT EXISTS chat_turns (
    id TEXT PRIMARY KEY, thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    owner TEXT NOT NULL, request_id TEXT NOT NULL, request_hash TEXT NOT NULL,
    ordinal INTEGER NOT NULL, question TEXT NOT NULL, reply TEXT,
    state TEXT NOT NULL, created_at TEXT NOT NULL, finished_at TEXT,
    UNIQUE(owner,request_id), UNIQUE(thread_id,ordinal));`);
  function seal(value, aad) {
    const iv = randomBytes(12),
      c = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
    c.setAAD(Buffer.from(aad));
    const encrypted = Buffer.concat([
      c.update(JSON.stringify(value)),
      c.final(),
    ]);
    return (
      "v1." +
      [iv, c.getAuthTag(), encrypted].map((v) => v.toString("base64")).join(".")
    );
  }
  function open(value, aad) {
    const [version, iv, tag, content] = value.split(".");
    if (version !== "v1") throw new Error("Unknown chat key version");
    const c = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(key, "hex"),
      Buffer.from(iv, "base64"),
    );
    c.setAAD(Buffer.from(aad));
    c.setAuthTag(Buffer.from(tag, "base64"));
    return JSON.parse(
      Buffer.concat([
        c.update(Buffer.from(content, "base64")),
        c.final(),
      ]).toString(),
    );
  }
  function atomic(fn) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      db.exec("COMMIT");
      return value;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  function clean(value, max) {
    if (typeof value !== "string" || !value.trim() || value.length > max)
      throw new HistoryError(`Enter between 1 and ${max} characters`);
    return value.trim();
  }
  function owned(owner, id) {
    const row = db
      .prepare("SELECT * FROM chat_threads WHERE owner=? AND id=?")
      .get(owner, id);
    if (!row) throw new HistoryError("Conversation not found", 404);
    return row;
  }
  const titleOf = (r) => ({
    ...r,
    title: open(r.title, `${r.owner}/${r.id}/title`),
  });
  function turnOf(r) {
    return {
      id: r.id,
      ordinal: r.ordinal,
      state: r.state,
      created_at: r.created_at,
      finished_at: r.finished_at,
      ...open(r.question, `${r.owner}/${r.thread_id}/${r.id}/question`),
      reply: r.reply
        ? open(r.reply, `${r.owner}/${r.thread_id}/${r.id}/reply`)
        : null,
    };
  }
  function list(owner, { archived = false, offset = 0 } = {}) {
    offset = Number(offset);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
      throw new HistoryError("Invalid page");
    const rows = db
      .prepare(
        "SELECT * FROM chat_threads WHERE owner=? AND archived=? ORDER BY pinned DESC,updated_at DESC,id DESC LIMIT 31 OFFSET ?",
      )
      .all(owner, archived ? 1 : 0, offset);
    return {
      threads: rows.slice(0, 30).map(titleOf),
      next: rows.length > 30 ? offset + 30 : null,
    };
  }
  function create(owner, id = randomUUID()) {
    if (!/^[a-zA-Z0-9-]{16,80}$/.test(id))
      throw new HistoryError("Invalid conversation id");
    const existing = db
      .prepare("SELECT * FROM chat_threads WHERE id=?")
      .get(id);
    if (existing) return titleOf(owned(owner, id));
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO chat_threads (id,owner,title,created_at,updated_at) VALUES (?,?,?,?,?)",
    ).run(
      id,
      owner,
      seal("New conversation", `${owner}/${id}/title`),
      now,
      now,
    );
    return titleOf(owned(owner, id));
  }
  function read(owner, id, before = 2147483647) {
    const thread = titleOf(owned(owner, id));
    before = Number(before);
    if (!Number.isSafeInteger(before) || before < 1)
      throw new HistoryError("Invalid message cursor");
    const rows = db
      .prepare(
        "SELECT * FROM chat_turns WHERE owner=? AND thread_id=? AND ordinal<? ORDER BY ordinal DESC LIMIT 31",
      )
      .all(owner, id, before);
    const turns = rows.slice(0, 30).reverse().map(turnOf);
    return {
      thread,
      turns,
      before: rows.length > 30 ? turns[0].ordinal : null,
    };
  }
  function update(owner, id, input) {
    const row = owned(owner, id);
    if (input.revision !== row.revision)
      throw new HistoryError(
        "Conversation changed. Refresh and try again.",
        409,
      );
    const title =
      input.title === undefined
        ? row.title
        : seal(clean(input.title, 100), `${owner}/${id}/title`);
    for (const name of ["pinned", "archived"])
      if (input[name] !== undefined && typeof input[name] !== "boolean")
        throw new HistoryError("Invalid setting");
    db.prepare(
      "UPDATE chat_threads SET title=?,pinned=?,archived=?,revision=revision+1,updated_at=? WHERE id=? AND owner=?",
    ).run(
      title,
      input.pinned === undefined ? row.pinned : Number(input.pinned),
      input.archived === undefined ? row.archived : Number(input.archived),
      new Date().toISOString(),
      id,
      owner,
    );
    return titleOf(owned(owner, id));
  }
  function remove(owner, id) {
    owned(owner, id);
    db.prepare("DELETE FROM chat_threads WHERE owner=? AND id=?").run(
      owner,
      id,
    );
  }
  function accept(
    owner,
    id,
    { requestId, question, revision, context = {} },
    gate = null,
  ) {
    question = clean(question, 4000);
    if (!/^[a-zA-Z0-9-]{16,100}$/.test(requestId || ""))
      throw new HistoryError("Invalid request id");
    if (JSON.stringify(context).length > 1000)
      throw new HistoryError("Context too large");
    const hash = createHash("sha256")
      .update(JSON.stringify({ id, question, context }))
      .digest("hex");
    return atomic(() => {
      const row = owned(owner, id);
      const existing = db
        .prepare("SELECT * FROM chat_turns WHERE owner=? AND request_id=?")
        .get(owner, requestId);
      if (existing) {
        if (existing.request_hash !== hash)
          throw new HistoryError(
            "Request id already used for another message",
            409,
          );
        return { turn: turnOf(existing), fresh: false };
      }
      if (gate) throw gate;
      if (row.archived)
        throw new HistoryError("Restore this conversation before sending", 409);
      if (row.revision !== revision)
        throw new HistoryError(
          "Conversation changed. Refresh before sending.",
          409,
        );
      if (db.prepare("SELECT id FROM chat_turns WHERE state='running'").get())
        throw new HistoryError(
          "Another reply is running. Wait for it to finish.",
          429,
        );
      const turnId = randomUUID(),
        now = new Date().toISOString();
      const ordinal = db
        .prepare(
          "SELECT COALESCE(MAX(ordinal),0)+1 AS n FROM chat_turns WHERE thread_id=?",
        )
        .get(id).n;
      db.prepare(
        "INSERT INTO chat_turns (id,thread_id,owner,request_id,request_hash,ordinal,question,state,created_at) VALUES (?,?,?,?,?,?,?,'running',?)",
      ).run(
        turnId,
        id,
        owner,
        requestId,
        hash,
        ordinal,
        seal({ question, context }, `${owner}/${id}/${turnId}/question`),
        now,
      );
      db.prepare(
        "UPDATE chat_threads SET revision=revision+1,updated_at=?,title=? WHERE id=?",
      ).run(
        now,
        ordinal === 1
          ? seal(question.slice(0, 80), `${owner}/${id}/title`)
          : row.title,
        id,
      );
      return {
        turn: turnOf(
          db.prepare("SELECT * FROM chat_turns WHERE id=?").get(turnId),
        ),
        fresh: true,
      };
    });
  }
  function finish(owner, id, turnId, reply, state = "completed") {
    return atomic(() => {
      const r = db
        .prepare(
          "SELECT * FROM chat_turns WHERE id=? AND owner=? AND thread_id=? AND state='running'",
        )
        .get(turnId, owner, id);
      if (!r) return false; // Deletion or restart must never resurrect a conversation.
      const now = new Date().toISOString();
      db.prepare(
        "UPDATE chat_turns SET state=?,reply=?,finished_at=? WHERE id=?",
      ).run(
        state,
        reply ? seal(reply, `${owner}/${id}/${turnId}/reply`) : null,
        now,
        turnId,
      );
      db.prepare(
        "UPDATE chat_threads SET revision=revision+1,updated_at=? WHERE id=?",
      ).run(now, id);
      return true;
    });
  }
  function context(owner, id) {
    owned(owner, id);
    const rows = db
      .prepare(
        "SELECT * FROM chat_turns WHERE owner=? AND thread_id=? AND state IN ('completed','running') ORDER BY ordinal DESC LIMIT 10",
      )
      .all(owner, id)
      .reverse();
    return rows.flatMap((r) => {
      const t = turnOf(r);
      return [
        { role: "user", content: t.question },
        ...(t.reply
          ? [{ role: "assistant", content: t.reply.answer.slice(0, 4000) }]
          : []),
      ];
    });
  }
  function recover() {
    db.prepare(
      "UPDATE chat_turns SET state='interrupted',finished_at=? WHERE state='running'",
    ).run(new Date().toISOString());
  }
  // Fail closed on a wrong key before recovery can change any saved job state.
  const sample = db.prepare("SELECT * FROM chat_threads LIMIT 1").get();
  if (sample) open(sample.title, `${sample.owner}/${sample.id}/title`);
  return {
    list,
    create,
    read,
    update,
    remove,
    accept,
    finish,
    context,
    recover,
  };
}
// One worker per application process. Transport disconnects do not replay work.
export function historyWorker(store, generate, configured = () => true) {
  let active = false;
  async function send(owner, id, input) {
    const gate = active
      ? new HistoryError("Another reply is running. Try again shortly.", 429)
      : !configured()
        ? new HistoryError(
            "Assistant is not configured. Saved history is still available.",
            503,
          )
        : null;
    const accepted = store.accept(owner, id, input, gate);
    if (!accepted.fresh) return accepted.turn;
    active = true;
    void (async () => {
      try {
        const reply = await generate(
          store.context(owner, id),
          accepted.turn.context,
        );
        store.finish(owner, id, accepted.turn.id, reply);
      } catch {
        try {
          store.finish(owner, id, accepted.turn.id, null, "failed");
        } catch {
          console.error(
            "Chat result could not be saved; request will not be replayed.",
          );
        }
      } finally {
        active = false;
      }
    })();
    return accepted.turn;
  }
  return {
    send,
    get busy() {
      return active;
    },
  };
}
