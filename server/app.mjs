import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import {
  randomBytes,
  randomUUID,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { text, month, date, cents, InputError } from "./domain.mjs";
import { plaidClient, syncPlaid } from "./providers/plaid.mjs";
import {
  snaptradeClient,
  connectSnaptrade,
  syncSnaptrade,
} from "./providers/snaptrade.mjs";
import { answer } from "./providers/ai.mjs";
const staticFiles = new Map([
  ["/", ["index.html", "text/html"]],
  ["/app.js", ["app.js", "text/javascript"]],
  ["/style.css", ["style.css", "text/css"]],
  ["/logo.svg", ["logo.svg", "image/svg+xml"]],
  [
    "/manifest.webmanifest",
    ["manifest.webmanifest", "application/manifest+json"],
  ],
  ["/icons/apple-touch-icon.png", ["icons/apple-touch-icon.png", "image/png"]],
  ["/icons/icon-192.png", ["icons/icon-192.png", "image/png"]],
  ["/icons/icon-512.png", ["icons/icon-512.png", "image/png"]],
]);
const digest = (s) => createHash("sha256").update(s).digest();
export function createApp(config, store) {
  const sessions = new Map();
  let loginFailures = 0,
    loginWindow = Date.now(),
    busy = false;
  const rate = new Map();
  const requestPlaid = plaidClient(config);
  function json(res, status, value) {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify(value));
  }
  async function body(req) {
    if (req.headers["content-type"]?.split(";")[0] !== "application/json")
      throw new InputError("Expected application/json");
    const parts = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 8192) throw new InputError("Request too large");
      parts.push(chunk);
    }
    try {
      const value = JSON.parse(Buffer.concat(parts).toString());
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error();
      return value;
    } catch {
      throw new InputError("Expected a JSON object");
    }
  }
  async function exclusive(fn) {
    if (busy)
      throw new InputError(
        "Another provider or AI request is running. Try again shortly.",
      );
    busy = true;
    try {
      return await fn();
    } finally {
      busy = false;
    }
  }
  return createServer(async (req, res) => {
    const headers = {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy": `default-src 'self'; manifest-src 'self'; script-src 'self' https://cdn.plaid.com; style-src 'self'; img-src 'self' data:; connect-src 'self' https://*.plaid.com; frame-src https://*.plaid.com; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
    };
    for (const [key, value] of Object.entries(headers))
      res.setHeader(key, value);
    try {
      if (req.headers.host !== `127.0.0.1:${config.port}`)
        return json(res, 403, { error: "Open the documented 127.0.0.1 URL" });
      if (!["GET", "POST", "PUT", "PATCH"].includes(req.method))
        return json(res, 405, { error: "Method not allowed" });
      if (req.method !== "GET" && req.headers.origin !== config.origin)
        return json(res, 403, { error: "Origin rejected" });
      const url = new URL(req.url, config.origin),
        path = url.pathname;
      if (req.method === "GET" && staticFiles.has(path)) {
        const [file, type] = staticFiles.get(path);
        const content = await readFile(
          new URL(`../web/${file}`, import.meta.url),
        );
        res.writeHead(200, { "Content-Type": `${type}; charset=utf-8` });
        return res.end(content);
      }
      if (path === "/api/session" && req.method === "GET")
        return json(res, 200, { mode: config.mode });
      if (path === "/api/login" && req.method === "POST") {
        if (Date.now() - loginWindow > 600000) {
          loginFailures = 0;
          loginWindow = Date.now();
        }
        if (loginFailures >= 10)
          return json(res, 429, {
            error: "Too many login attempts. Wait ten minutes.",
          });
        const input = await body(req);
        const password =
          typeof input.password === "string" ? input.password : "";
        if (!timingSafeEqual(digest(password), digest(config.password))) {
          loginFailures++;
          return json(res, 401, { error: "Incorrect password" });
        }
        for (const [token, expiry] of sessions)
          if (expiry < Date.now()) sessions.delete(token);
        if (sessions.size >= 100) sessions.delete(sessions.keys().next().value);
        const token = randomBytes(32).toString("hex");
        sessions.set(token, Date.now() + 8 * 3600000);
        res.setHeader(
          "Set-Cookie",
          `budget_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,
        );
        return json(res, 200, { ok: true });
      }
      const token = (req.headers.cookie || "")
        .split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith("budget_session="))
        ?.slice(15);
      if (!token || (sessions.get(token) || 0) < Date.now())
        return json(res, 401, { error: "Sign in to your budget" });
      if (path === "/api/logout" && req.method === "POST") {
        sessions.delete(token);
        res.setHeader(
          "Set-Cookie",
          "budget_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
        );
        return json(res, 200, { ok: true });
      }
      if (path === "/api/state" && req.method === "GET") {
        const selectedMonth = month(
          url.searchParams.get("month") || new Date().toISOString().slice(0, 7),
        );
        return json(res, 200, {
          mode: config.mode,
          currency: config.currency,
          summary: store.summary(selectedMonth),
          categories: store.db
            .prepare("SELECT * FROM categories ORDER BY kind,name")
            .all(),
          transactions: store.db
            .prepare(
              "SELECT id,source,date,description,amount_cents,currency,category_id,pending,reviewed FROM transactions WHERE removed=0 AND date LIKE ? ORDER BY date DESC,id DESC",
            )
            .all(`${selectedMonth}-%`),
          investments: store.db.prepare("SELECT * FROM investments").all(),
          connections: store.db
            .prepare("SELECT id,provider,synced_at,status FROM connections")
            .all(),
          providers: {
            plaid: config.plaid,
            plaidEnvironment: config.plaidEnv,
            snaptrade: config.snaptrade,
            ai: config.ai,
          },
        });
      }
      if (path === "/api/budgets" && req.method === "PUT") {
        const input = await body(req),
          limit = cents(input.amount);
        if (limit < 0) throw new InputError("Budget cannot be negative");
        store.budget(month(input.month), text(input.category_id), limit);
        return json(res, 200, { ok: true });
      }
      if (path === "/api/categories" && req.method === "POST") {
        const input = await body(req);
        const name = text(input.name, 40);
        if (
          store.db
            .prepare("SELECT id FROM categories WHERE lower(name)=lower(?)")
            .get(name)
        )
          throw new InputError("Category already exists");
        const id = randomUUID();
        store.db
          .prepare("INSERT INTO categories VALUES (?,?,'expense')")
          .run(id, name);
        return json(res, 201, { id });
      }
      if (path === "/api/transactions" && req.method === "POST") {
        const input = await body(req),
          category = text(input.category_id);
        if (
          !store.db
            .prepare("SELECT id FROM categories WHERE id=?")
            .get(category)
        )
          throw new InputError("Unknown category");
        const id = randomUUID();
        store.db
          .prepare(
            "INSERT INTO transactions (id,source,date,description,amount_cents,currency,category_id,reviewed) VALUES (?,'manual',?,?,?,?,?,1)",
          )
          .run(
            id,
            date(input.date),
            text(input.description, 160),
            cents(input.amount),
            config.currency,
            category,
          );
        return json(res, 201, { id });
      }
      if (path === "/api/transactions/category" && req.method === "PATCH") {
        const input = await body(req);
        if (
          !store.db
            .prepare("SELECT id FROM categories WHERE id=?")
            .get(text(input.category_id))
        )
          throw new InputError("Unknown category");
        const result = store.db
          .prepare(
            "UPDATE transactions SET category_id=?,reviewed=1 WHERE id=? AND removed=0",
          )
          .run(input.category_id, text(input.id, 300));
        if (!result.changes) throw new InputError("Unknown transaction");
        return json(res, 200, { ok: true });
      }
      if (path === "/api/chat" && req.method === "POST") {
        const input = await body(req),
          question = text(input.question, 1200),
          selectedMonth = month(input.month);
        const last = rate.get("chat") || 0;
        if (Date.now() - last < 1500)
          return json(res, 429, {
            error: "Please wait a moment before asking again",
          });
        rate.set("chat", Date.now());
        return json(
          res,
          200,
          await exclusive(() =>
            answer(question, store.summary(selectedMonth), config),
          ),
        );
      }
      if (path.startsWith("/api/providers/") && req.method === "POST") {
        if (config.mode !== "personal")
          throw new InputError(
            "Provider connections are disabled in the synthetic demo",
          );
        const input = await body(req);
        const provider = path.split("/")[3];
        if (!config[provider])
          throw new InputError(
            "Configure this provider in your private .env and restart",
          );
        if (Date.now() - (rate.get(provider) || 0) < 3000)
          return json(res, 429, {
            error: "Please wait before another provider request",
          });
        rate.set(provider, Date.now());
        const result = await exclusive(async () => {
          if (path === "/api/providers/plaid/link") {
            let id = store.db
              .prepare("SELECT value FROM meta WHERE key='plaid_user_id'")
              .get()?.value;
            if (!id) {
              id = randomUUID();
              store.db
                .prepare("INSERT INTO meta VALUES (?,?)")
                .run("plaid_user_id", id);
            }
            const data = await requestPlaid("/link/token/create", {
              user: { client_user_id: id },
              client_name: "BAS — Budget Automation Studio",
              products: ["transactions"],
              country_codes: (config.env.PLAID_COUNTRY_CODES || "US").split(
                ",",
              ),
              language: "en",
            });
            return { link_token: data.link_token };
          }
          if (path === "/api/providers/plaid/exchange") {
            const data = await requestPlaid("/item/public_token/exchange", {
              public_token: text(input.public_token, 300),
            });
            if (!data.item_id || !data.access_token)
              throw new Error("Invalid exchange");
            const id = `plaid:${data.item_id}`;
            store.saveConnection(id, "plaid", {
              access_token: data.access_token,
            });
            return { ok: true };
          }
          if (path === "/api/providers/plaid/sync")
            return syncPlaid(
              store,
              text(input.id, 300),
              config.currency,
              requestPlaid,
            );
          if (path === "/api/providers/snaptrade/connect")
            return connectSnaptrade(store, config, snaptradeClient(config));
          if (path === "/api/providers/snaptrade/sync")
            return syncSnaptrade(store, config, snaptradeClient(config));
          throw new InputError("Unknown provider operation");
        });
        return json(res, 200, result);
      }
      return json(res, 404, { error: "Not found" });
    } catch (e) {
      // Never serialize SDK errors: request configs may contain provider secrets.
      if (e instanceof InputError) return json(res, 400, { error: e.message });
      return json(res, 502, {
        error:
          "The operation could not finish. Check provider configuration or availability; existing data was retained.",
      });
    }
  });
}
