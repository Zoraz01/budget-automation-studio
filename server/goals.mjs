import { randomUUID, createHash } from "node:crypto";

export class GoalError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const MAX = 100_000_000_00;
export function goalCents(value, { nullable = false } = {}) {
  if (nullable && (value === null || value === "")) return null;
  if (typeof value !== "string" || !/^\d{1,9}(\.\d{1,2})?$/.test(value))
    throw new GoalError(
      "Enter a nonnegative amount with at most two decimal places.",
    );
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > MAX)
    throw new GoalError("Amount is too large.");
  return cents;
}
const nonempty = (v, max = 120) => {
  if (typeof v !== "string" || !v.trim() || v.trim().length > max)
    throw new GoalError("Enter a valid name or identifier.");
  return v.trim();
};
const isoDate = (v) => {
  if (
    typeof v !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    !Number.isFinite(Date.parse(v + "T12:00:00Z")) ||
    new Date(v + "T12:00:00Z").toISOString().slice(0, 10) !== v
  )
    throw new GoalError("Enter a valid date.");
  return v;
};
export function initGoals(db) {
  db.exec(`BEGIN IMMEDIATE;
    CREATE TABLE IF NOT EXISTS goals_meta (id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS goal_settings (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL DEFAULT 0, monthly_limit_cents INTEGER, source_id TEXT, bills_cents INTEGER NOT NULL DEFAULT 0, buffer_cents INTEGER NOT NULL DEFAULT 0, protection_at TEXT, timezone TEXT NOT NULL DEFAULT 'UTC', due_day INTEGER NOT NULL DEFAULT 1, automatic INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS goal_cash (id TEXT PRIMARY KEY, name TEXT NOT NULL, balance_cents INTEGER NOT NULL, observed_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS goals (id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('purchase','longterm')), target_cents INTEGER, saved_cents INTEGER NOT NULL DEFAULT 0 CHECK(saved_cents>=0), monthly_cents INTEGER NOT NULL DEFAULT 0 CHECK(monthly_cents>=0), status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','archived')), priority INTEGER NOT NULL DEFAULT 0, desired_date TEXT, url TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', next_due TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS goal_entries (id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goals(id), amount_cents INTEGER NOT NULL, kind TEXT NOT NULL, memo TEXT NOT NULL, created_at TEXT NOT NULL, schedule_key TEXT UNIQUE);
    CREATE TABLE IF NOT EXISTS goal_purchases (id TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goals(id), amount_cents INTEGER NOT NULL CHECK(amount_cents>0), held_cents INTEGER NOT NULL CHECK(held_cents>=0), method TEXT NOT NULL CHECK(method IN ('cash','card')), transaction_id TEXT UNIQUE, settled_at TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS goal_runs (schedule_key TEXT PRIMARY KEY, goal_id TEXT NOT NULL REFERENCES goals(id), status TEXT NOT NULL, reason TEXT, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS goal_commands (request_id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, result TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS goal_entries_goal ON goal_entries(goal_id,created_at);
    INSERT OR IGNORE INTO goals_meta VALUES (1,1);
    INSERT OR IGNORE INTO goal_settings (id) VALUES (1);
    COMMIT;`);
  if (
    db.prepare("SELECT version FROM goals_meta WHERE id=1").get().version !== 1
  )
    throw new Error("Unsupported Goals schema.");
}

// All adapters return cash observations and existing transactions. This module
// never moves money, changes an expense, calls a provider, or values securities.
export function goalsService(
  db,
  {
    accounts = () => [],
    transaction = () => null,
    transactions = () => [],
    currency = "USD",
    now = () => new Date(),
  } = {},
) {
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const get = (sql, ...args) => db.prepare(sql).get(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  const stamp = () => now().toISOString();
  const settings = () => get("SELECT * FROM goal_settings WHERE id=1");
  function atomic(fn) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const r = fn();
      db.exec("COMMIT");
      return r;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  function today(s = settings()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: s.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now());
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }
  function following(s, from = today(s)) {
    const due = `${from.slice(0, 7)}-${String(s.due_day).padStart(2, "0")}`;
    if (due > from) return due;
    const d = new Date(from.slice(0, 7) + "-01T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + 1);
    return `${d.toISOString().slice(0, 7)}-${String(s.due_day).padStart(2, "0")}`;
  }
  const reserved = () =>
    get("SELECT COALESCE(SUM(saved_cents),0) n FROM goals").n;
  const holds = () =>
    get("SELECT COALESCE(SUM(held_cents),0) n FROM goal_purchases").n;
  const planned = () =>
    get(
      "SELECT COALESCE(SUM(monthly_cents),0) n FROM goals WHERE status='active'",
    ).n;
  function sources() {
    return [
      ...accounts(),
      ...all("SELECT * FROM goal_cash").map((a) => ({
        ...a,
        kind: "manual",
        basis: "Manually confirmed cash balance",
        currency,
      })),
    ];
  }
  function capacity() {
    const s = settings(),
      source = sources().find((a) => String(a.id) === s.source_id);
    let reason = null;
    if (!source) reason = "Choose a backing cash account in Funding setup.";
    else if (
      !Number.isSafeInteger(source.balance_cents) ||
      source.currency !== currency
    )
      reason = "Backing cash balance is unavailable.";
    else if (
      !source.observed_at ||
      !Number.isFinite(Date.parse(source.observed_at)) ||
      now() - new Date(source.observed_at) > 36 * 3600000 ||
      new Date(source.observed_at) > now()
    )
      reason = "Cash balance is stale. Sync or confirm it before allocating.";
    else if (
      !s.protection_at ||
      now() - new Date(s.protection_at) > 35 * 86400000
    )
      reason = "Review bills, card payments, and your buffer in Funding setup.";
    const total = reserved() + holds();
    const remaining =
      source && Number.isSafeInteger(source.balance_cents)
        ? source.balance_cents - s.bills_cents - s.buffer_cents - total
        : null;
    return {
      source: source || null,
      reserved_cents: reserved(),
      payment_holds_cents: holds(),
      protected_cents: s.bills_cents + s.buffer_cents,
      remaining_cents: remaining,
      available_cents: reason ? null : Math.max(0, remaining),
      shortfall_cents: remaining === null ? null : Math.max(0, -remaining),
      reason,
    };
  }
  function goal(id) {
    const g = get("SELECT * FROM goals WHERE id=?", nonempty(id));
    if (!g) throw new GoalError("Goal not found.", 404);
    return g;
  }
  function entry(g, amount, kind, memo, key = null) {
    run(
      "INSERT INTO goal_entries VALUES (?,?,?,?,?,?,?)",
      randomUUID(),
      g.id,
      amount,
      kind,
      memo,
      stamp(),
      key,
    );
    run(
      "UPDATE goals SET saved_cents=saved_cents+?,updated_at=? WHERE id=?",
      amount,
      stamp(),
      g.id,
    );
  }
  function requireCash(amount) {
    const c = capacity();
    if (c.reason) throw new GoalError(c.reason, 409);
    if (amount > c.available_cents)
      throw new GoalError(
        "Not enough unreserved cash after bills, payment holds, and your buffer.",
        409,
      );
  }
  function validateTarget(kind, target) {
    if (
      !["purchase", "longterm"].includes(kind) ||
      (kind === "purchase" && !(target > 0)) ||
      target === 0
    )
      throw new GoalError(
        "Purchases need a positive target; long-term targets may be blank.",
      );
  }
  function monthlyFits(total) {
    const limit = settings().monthly_limit_cents;
    if (total > 0 && (limit === null || total > limit))
      throw new GoalError(
        "Contributions exceed your monthly goal limit. Edit the monthly plan first.",
        409,
      );
  }
  function safeURL(v) {
    if (!v) return "";
    let u;
    try {
      u = new URL(nonempty(v, 1000));
    } catch {
      throw new GoalError("Use a valid product link.");
    }
    if (!["https:", "http:"].includes(u.protocol))
      throw new GoalError("Use an http or https product link.");
    return u.href;
  }
  function receipt(id, amount, method) {
    const t = transaction(nonempty(String(id), 300));
    if (
      !t ||
      t.removed ||
      t.pending ||
      t.transfer ||
      t.eligible === false ||
      t.amount_cents !== amount ||
      t.currency !== currency
    )
      throw new GoalError(
        "Choose a posted purchase with the same amount and currency.",
      );
    if (t.method && t.method !== method)
      throw new GoalError(
        "Payment method must match the selected transaction.",
      );
    return t;
  }
  function mutate(action, p) {
    const s = settings();
    if (action === "configure") {
      if (p.protection_confirmed !== true)
        throw new GoalError(
          "Confirm that protected money includes upcoming bills, card payments, and a buffer.",
        );
      const bills = goalCents(p.bills),
        buffer = goalCents(p.buffer),
        limit = goalCents(p.monthly_limit, { nullable: true });
      if (planned() > (limit ?? 0))
        throw new GoalError(
          "Lower contributions before lowering the monthly limit.",
        );
      const tz = nonempty(p.timezone, 80);
      try {
        new Intl.DateTimeFormat("en", { timeZone: tz }).format();
      } catch {
        throw new GoalError("Choose a valid time zone.");
      }
      const day = Number(p.due_day);
      if (!Number.isInteger(day) || day < 1 || day > 28)
        throw new GoalError("Choose a contribution day from 1 to 28.");
      const id = nonempty(p.source_id, 300);
      if (!sources().some((a) => String(a.id) === id))
        throw new GoalError("Choose an available cash account.");
      if (s.source_id && s.source_id !== id && reserved() + holds() > 0)
        throw new GoalError(
          "Release reservations and settle payment holds before changing the backing account.",
        );
      run(
        "UPDATE goal_settings SET source_id=?,bills_cents=?,buffer_cents=?,monthly_limit_cents=?,protection_at=?,timezone=?,due_day=?,automatic=? WHERE id=1",
        id,
        bills,
        buffer,
        limit,
        stamp(),
        tz,
        day,
        p.automatic === true ? 1 : 0,
      );
      if (
        day !== s.due_day ||
        tz !== s.timezone ||
        (!s.automatic && p.automatic)
      )
        for (const g of all(
          "SELECT * FROM goals WHERE status='active' AND monthly_cents>0",
        ))
          run(
            "UPDATE goals SET next_due=? WHERE id=?",
            following(settings()),
            g.id,
          );
      return { ok: true };
    }
    if (action === "cash") {
      if (p.confirmed !== true)
        throw new GoalError("Confirm the observed cash balance.");
      const amount =
          typeof p.balance === "string" && p.balance.startsWith("-")
            ? -goalCents(p.balance.slice(1))
            : goalCents(p.balance),
        name = nonempty(p.name, 80);
      run(
        "INSERT INTO goal_cash VALUES ('manual',?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,balance_cents=excluded.balance_cents,observed_at=excluded.observed_at",
        name,
        amount,
        stamp(),
      );
      return { ok: true };
    }
    if (action === "plan") {
      const limit = goalCents(p.monthly_limit, { nullable: true });
      if (!Array.isArray(p.contributions) || p.contributions.length > 200)
        throw new GoalError("Invalid contribution plan.");
      const seen = new Set();
      const values = new Map(
        all("SELECT id,monthly_cents FROM goals WHERE status='active'").map(
          (g) => [g.id, g.monthly_cents],
        ),
      );
      for (const item of p.contributions) {
        const g = goal(item.id);
        if (g.status !== "active" || seen.has(g.id))
          throw new GoalError("Invalid or duplicate goal in plan.");
        seen.add(g.id);
        values.set(g.id, goalCents(item.amount));
      }
      const total = [...values.values()].reduce((a, b) => a + b, 0);
      if (total > (limit ?? 0))
        throw new GoalError("Contributions exceed the monthly limit.");
      run("UPDATE goal_settings SET monthly_limit_cents=? WHERE id=1", limit);
      for (const [id, amount] of values) {
        const g = goal(id);
        if (
          amount &&
          g.target_cents !== null &&
          g.saved_cents >= g.target_cents
        )
          throw new GoalError(
            "A fully funded goal does not need monthly contributions.",
          );
        run(
          "UPDATE goals SET monthly_cents=?,next_due=?,updated_at=? WHERE id=?",
          amount,
          amount ? (g.monthly_cents ? g.next_due : following(s)) : null,
          stamp(),
          id,
        );
      }
      return { ok: true };
    }
    if (action === "create" || action === "update") {
      const g = action === "update" ? goal(p.id) : null;
      if (g && g.status !== "active")
        throw new GoalError("Only active goals can be edited.");
      if (!g && get("SELECT count(*) n FROM goals").n >= 200)
        throw new GoalError(
          "Archive and reuse existing goals; this workspace supports 200 goals.",
        );
      const name = nonempty(p.name, 80),
        kind = p.kind,
        target = goalCents(p.target, { nullable: true }),
        monthly = goalCents(p.monthly),
        priority = Number(p.priority || 0);
      validateTarget(kind, target);
      if (target !== null && target < (g?.saved_cents || 0))
        throw new GoalError(
          "Release excess reservations before lowering the target.",
        );
      if (!Number.isInteger(priority) || priority < 0 || priority > 99)
        throw new GoalError("Priority must be between 0 and 99.");
      if (target !== null && target === (g?.saved_cents || 0) && monthly > 0)
        throw new GoalError("Pause the contribution for a fully funded goal.");
      monthlyFits(planned() - (g?.monthly_cents || 0) + monthly);
      const desired = p.desired_date ? isoDate(p.desired_date) : null,
        url = safeURL(p.url),
        notes = String(p.notes || "").trim();
      if (notes.length > 2000)
        throw new GoalError("Keep notes under 2,000 characters.");
      const id = g?.id || randomUUID(),
        next = monthly ? (g?.monthly_cents ? g.next_due : following(s)) : null;
      if (g)
        run(
          "UPDATE goals SET name=?,kind=?,target_cents=?,monthly_cents=?,priority=?,desired_date=?,url=?,notes=?,next_due=?,updated_at=? WHERE id=?",
          name,
          kind,
          target,
          monthly,
          priority,
          desired,
          url,
          notes,
          next,
          stamp(),
          id,
        );
      else
        run(
          "INSERT INTO goals(id,name,kind,target_cents,monthly_cents,priority,desired_date,url,notes,next_due,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
          id,
          name,
          kind,
          target,
          monthly,
          priority,
          desired,
          url,
          notes,
          next,
          stamp(),
          stamp(),
        );
      return { id };
    }
    if (action === "settle" || action === "link") {
      const purchase = get(
        "SELECT * FROM goal_purchases WHERE id=?",
        nonempty(p.purchase_id),
      );
      if (!purchase) throw new GoalError("Purchase not found.", 404);
      if (action === "link") {
        receipt(p.transaction_id, purchase.amount_cents, purchase.method);
        if (
          get(
            "SELECT id FROM goal_purchases WHERE transaction_id=? AND id!=?",
            String(p.transaction_id),
            purchase.id,
          )
        )
          throw new GoalError("This transaction is already linked to a goal.");
        run(
          "UPDATE goal_purchases SET transaction_id=? WHERE id=?",
          String(p.transaction_id),
          purchase.id,
        );
      } else {
        if (p.confirmed !== true)
          throw new GoalError(
            "Confirm the payment is reflected in the backing cash balance.",
          );
        const c = capacity();
        if (c.reason) throw new GoalError(c.reason, 409);
        if (purchase.held_cents <= 0)
          throw new GoalError("This payment hold has already been settled.");
        run(
          "UPDATE goal_purchases SET held_cents=0,settled_at=? WHERE id=?",
          stamp(),
          purchase.id,
        );
      }
      return { ok: true };
    }
    const g = goal(p.id);
    if (g.status !== "active" && action !== "restore")
      throw new GoalError(
        "Restore this goal before changing its reservations.",
      );
    if (action === "reserve" || action === "release" || action === "move") {
      const amount = goalCents(p.amount);
      if (amount <= 0) throw new GoalError("Amount must be greater than zero.");
      if (action === "reserve") {
        requireCash(amount);
        if (g.target_cents !== null && g.saved_cents + amount > g.target_cents)
          throw new GoalError("That exceeds the goal target.");
        entry(g, amount, "reserve", "One-time contribution");
      } else {
        if (amount > g.saved_cents)
          throw new GoalError("That exceeds the amount set aside.");
        entry(
          g,
          -amount,
          action,
          action === "move"
            ? "Moved to another goal"
            : "Released to unassigned cash",
        );
        if (action === "move") {
          const dest = goal(p.destination_id);
          if (dest.id === g.id || dest.status !== "active")
            throw new GoalError("Choose a different active goal.");
          if (
            dest.target_cents !== null &&
            dest.saved_cents + amount > dest.target_cents
          )
            throw new GoalError("That exceeds the destination target.");
          entry(dest, amount, "move", "Moved from another goal");
          pauseAtTarget(dest.id);
        }
      }
      pauseAtTarget(g.id);
      return { ok: true };
    }
    if (action === "archive" || action === "complete") {
      if (p.confirmed !== true)
        throw new GoalError(
          "Confirm that unused reservations will be released.",
        );
      if (g.saved_cents)
        entry(g, -g.saved_cents, "release", "Unused reservation released");
      run(
        "UPDATE goals SET status=?,monthly_cents=0,next_due=NULL,updated_at=? WHERE id=?",
        action === "archive" ? "archived" : "completed",
        stamp(),
        g.id,
      );
      return { ok: true };
    }
    if (action === "restore") {
      run(
        "UPDATE goals SET status='active',monthly_cents=0,next_due=NULL,updated_at=? WHERE id=?",
        stamp(),
        g.id,
      );
      return { ok: true };
    }
    if (action === "purchase") {
      if (p.confirmed !== true)
        throw new GoalError("Confirm the purchase and payment hold.");
      const amount = goalCents(p.amount);
      if (amount <= 0 || amount > g.saved_cents)
        throw new GoalError(
          "Set aside enough money for the actual purchase price first.",
        );
      if (!["cash", "card"].includes(p.method))
        throw new GoalError("Choose cash or credit card.");
      if (p.transaction_id) {
        receipt(p.transaction_id, amount, p.method);
        if (
          get(
            "SELECT id FROM goal_purchases WHERE transaction_id=?",
            String(p.transaction_id),
          )
        )
          throw new GoalError("This transaction is already linked to a goal.");
      }
      const id = randomUUID();
      entry(g, -amount, "purchase", "Used for purchase; held for payment");
      run(
        "INSERT INTO goal_purchases(id,goal_id,amount_cents,held_cents,method,transaction_id,created_at) VALUES (?,?,?,?,?,?,?)",
        id,
        g.id,
        amount,
        amount,
        p.method,
        p.transaction_id ? String(p.transaction_id) : null,
        stamp(),
      );
      if (g.kind === "purchase") {
        if (g.saved_cents > amount)
          entry(
            g,
            -(g.saved_cents - amount),
            "release",
            "Unused reservation released",
          );
        run(
          "UPDATE goals SET status='completed',monthly_cents=0,next_due=NULL,updated_at=? WHERE id=?",
          stamp(),
          g.id,
        );
      }
      return { id };
    }
    throw new GoalError("Unknown goal action.");
  }
  function pauseAtTarget(id) {
    run(
      "UPDATE goals SET monthly_cents=0,next_due=NULL WHERE id=? AND target_cents IS NOT NULL AND saved_cents>=target_cents",
      id,
    );
  }
  function execute(p) {
    if (!p || typeof p !== "object" || Array.isArray(p))
      throw new GoalError("Expected an action.");
    const requestId = nonempty(p.request_id, 100);
    if (!/^[\w-]{16,100}$/.test(requestId))
      throw new GoalError("Invalid request identity.");
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(p))
      .digest("hex");
    return atomic(() => {
      const prior = get(
        "SELECT * FROM goal_commands WHERE request_id=?",
        requestId,
      );
      if (prior) {
        if (prior.fingerprint !== fingerprint)
          throw new GoalError(
            "Request identity was reused with different values.",
            409,
          );
        return JSON.parse(prior.result);
      }
      if (
        !Number.isSafeInteger(p.revision) ||
        p.revision !== settings().revision
      )
        throw new GoalError(
          "Goals changed in another session. Refresh and review before saving.",
          409,
        );
      const result = mutate(p.action, p);
      run("UPDATE goal_settings SET revision=revision+1 WHERE id=1");
      run(
        "INSERT INTO goal_commands VALUES (?,?,?)",
        requestId,
        fingerprint,
        JSON.stringify(result),
      );
      return result;
    });
  }
  function runDue() {
    return atomic(() => {
      const s = settings();
      if (!s.automatic) return { allocated: 0 };
      const date = today(s),
        month = date.slice(0, 7);
      let allocated = 0,
        changed = false;
      for (const g of all(
        "SELECT * FROM goals WHERE status='active' AND monthly_cents>0 ORDER BY CASE WHEN priority=0 THEN 100 ELSE priority END,created_at,id",
      )) {
        if (!g.next_due) continue;
        if (g.next_due.slice(0, 7) < month) {
          g.next_due = `${month}-${String(s.due_day).padStart(2, "0")}`;
          run("UPDATE goals SET next_due=? WHERE id=?", g.next_due, g.id);
          changed = true;
        }
        if (g.next_due > date) continue;
        const key = `${g.id}:${month}`;
        if (get("SELECT id FROM goal_entries WHERE schedule_key=?", key)) {
          run(
            "UPDATE goals SET next_due=? WHERE id=?",
            following(s, date),
            g.id,
          );
          changed = true;
          continue;
        }
        const amount = Math.min(
          g.monthly_cents,
          g.target_cents === null
            ? MAX
            : Math.max(0, g.target_cents - g.saved_cents),
        );
        const c = capacity();
        let reason = c.reason;
        const used = get(
          "SELECT COALESCE(SUM(amount_cents),0) n FROM goal_entries WHERE kind='automatic' AND schedule_key LIKE ?",
          `%:${month}`,
        ).n;
        if (!reason && used + amount > (s.monthly_limit_cents ?? 0))
          reason = "Monthly allocation limit reached.";
        if (!reason && amount > (c.available_cents ?? 0))
          reason = "Not enough unreserved cash; full contribution is waiting.";
        if (!reason && amount > 0) {
          entry(g, amount, "automatic", "Scheduled monthly contribution", key);
          pauseAtTarget(g.id);
          if (goal(g.id).monthly_cents)
            run(
              "UPDATE goals SET next_due=? WHERE id=?",
              following(s, date),
              g.id,
            );
          allocated++;
          changed = true;
        } else if (!amount) {
          pauseAtTarget(g.id);
          changed = true;
        }
        const previous = get(
          "SELECT * FROM goal_runs WHERE schedule_key=?",
          key,
        );
        const status = reason ? "waiting" : "allocated";
        if (
          !previous ||
          previous.status !== status ||
          previous.reason !== reason
        ) {
          run(
            "INSERT INTO goal_runs VALUES (?,?,?,?,?) ON CONFLICT(schedule_key) DO UPDATE SET status=excluded.status,reason=excluded.reason,updated_at=excluded.updated_at",
            key,
            g.id,
            status,
            reason,
            stamp(),
          );
          changed = true;
        }
      }
      if (changed)
        run("UPDATE goal_settings SET revision=revision+1 WHERE id=1");
      return { allocated };
    });
  }
  function state() {
    const s = settings(),
      date = today(s);
    const purchases = all(
      "SELECT * FROM goal_purchases ORDER BY created_at DESC",
    ).map((p) => {
      const t = p.transaction_id ? transaction(p.transaction_id) : null;
      const changed =
        p.transaction_id &&
        (!t ||
          t.removed ||
          t.pending ||
          t.transfer ||
          t.eligible === false ||
          (t.method && t.method !== p.method) ||
          t.amount_cents !== p.amount_cents ||
          t.currency !== currency);
      return {
        ...p,
        transaction: t
          ? { id: t.id, date: t.date, description: t.description }
          : null,
        attention: changed
          ? "Linked transaction changed or was removed. Review this purchase."
          : null,
      };
    });
    return {
      currency,
      today: date,
      settings: s,
      accounts: sources(),
      capacity: capacity(),
      monthly_total_cents: planned(),
      goals: all(
        "SELECT * FROM goals ORDER BY CASE WHEN priority=0 THEN 100 ELSE priority END,created_at,id",
      ),
      purchases,
      entries: all(
        "SELECT * FROM goal_entries ORDER BY created_at DESC,rowid DESC LIMIT 200",
      ),
      waiting: s.automatic
        ? all(
            "SELECT r.* FROM goal_runs r JOIN goals g ON g.id=r.goal_id WHERE r.status='waiting' AND r.schedule_key LIKE ? AND g.status='active' AND g.monthly_cents>0 AND g.next_due<=?",
            `%:${date.slice(0, 7)}`,
            date,
          )
        : [],
    };
  }
  return {
    execute,
    state,
    runDue,
    capacity,
    transactions: (q = "") => transactions(String(q).slice(0, 100)),
  };
}
