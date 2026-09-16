import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { request as httpRequest } from "node:http";
import { createApp } from "../server/app.mjs";
import { configuration } from "../server/config.mjs";
import { openStore } from "../server/store.mjs";
async function fixture(t, env = {}, options = {}) {
  const config = configuration(env);
  const store = openStore(":memory:", config.vaultKey, "USD");
  store.seed("2026-05");
  const server = createApp(config, store, options);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  config.port = server.address().port;
  config.origin = `http://127.0.0.1:${config.port}`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    store.close();
  });
  let cookie = "";
  const call = async (path, method = "GET", body, headers = {}) =>
    fetch(config.origin + path, {
      method,
      headers: {
        ...(method !== "GET"
          ? { "Content-Type": "application/json", Origin: config.origin }
          : {}),
        Cookie: cookie,
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  const login = async () => {
    const r = await call("/api/login", "POST", { password: config.password });
    cookie = r.headers.get("set-cookie").split(";")[0];
    return r;
  };
  return { call, login, config, store };
}
test("financial APIs require a session; cookie is HttpOnly and SameSite Strict", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.call("/api/state")).status, 401);
  const login = await f.login();
  assert.match(login.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/);
  assert.equal((await f.call("/api/state?month=2026-05")).status, 200);
});
test("cross-origin writes and host-header attacks are blocked", async (t) => {
  const f = await fixture(t);
  assert.equal(
    (
      await f.call(
        "/api/login",
        "POST",
        { password: "demo" },
        { Origin: "https://example.org" },
      )
    ).status,
    403,
  );
  assert.equal(
    (await f.call("/api/login", "POST", { password: "demo" }, { Origin: "" }))
      .status,
    403,
  );
  const status = await new Promise((resolve, reject) => {
    const request = httpRequest(
      f.config.origin + "/api/session",
      { headers: { Host: "evil.example" } },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    request.on("error", reject);
    request.end();
  });
  assert.equal(status, 403);
});
test("bad passwords are throttled", async (t) => {
  const f = await fixture(t);
  for (let i = 0; i < 10; i++)
    assert.equal(
      (await f.call("/api/login", "POST", { password: "wrong" })).status,
      401,
    );
  assert.equal(
    (await f.call("/api/login", "POST", { password: "demo" })).status,
    429,
  );
});
test("logout invalidates session and API responses disable caching", async (t) => {
  const f = await fixture(t);
  await f.login();
  const r = await f.call("/api/state");
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.match(
    r.headers.get("content-security-policy"),
    /frame-ancestors 'none'/,
  );
  await f.call("/api/logout", "POST", {});
  assert.equal((await f.call("/api/state")).status, 401);
});
test("demo provider actions are blocked and state omits stored credentials", async (t) => {
  const f = await fixture(t);
  f.store.saveConnection("fixture", "plaid", {
    access_token: "private-fixture",
  });
  await f.login();
  assert.equal(
    (await f.call("/api/providers/plaid/link", "POST", {})).status,
    400,
  );
  const state = await (await f.call("/api/state")).text();
  assert.ok(!state.includes("private-fixture"));
  assert.ok(!state.includes("secret"));
});
test("manual transactions, budget editing and category review persist correctly", async (t) => {
  const f = await fixture(t);
  await f.login();
  const newCat = await (
    await f.call("/api/categories", "POST", { name: "Travel" })
  ).json();
  assert.ok(newCat.id);
  assert.equal(
    (
      await f.call("/api/budgets", "PUT", {
        month: "2026-05",
        category_id: newCat.id,
        amount: "100.05",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await f.call("/api/transactions", "POST", {
        date: "2026-05-03",
        description: "Fixture journey",
        amount: "2.29",
        category_id: newCat.id,
      })
    ).status,
    201,
  );
  const s = await (await f.call("/api/state?month=2026-05")).json();
  assert.equal(
    s.summary.categories.find((c) => c.id === newCat.id).remaining_cents,
    9776,
  );
  assert.equal(
    (
      await f.call("/api/budgets", "PUT", {
        month: "2026-05",
        category_id: "income",
        amount: "100",
      })
    ).status,
    400,
  );
});
test("input rejects invalid dates, negative budgets and oversized chat bodies", async (t) => {
  const f = await fixture(t);
  await f.login();
  assert.equal(
    (
      await f.call("/api/budgets", "PUT", {
        month: "2026-05",
        category_id: "food",
        amount: "-1",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.call("/api/transactions", "POST", {
        date: "2026-02-30",
        description: "Fixture",
        amount: "2",
        category_id: "food",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.call("/api/chat", "POST", {
        month: "2026-05",
        question: "a".repeat(1300),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.call("/api/chat", "POST", {
        month: "2026-05",
        question: "a".repeat(9000),
      })
    ).status,
    400,
  );
});
test("private paths and unlisted files cannot be served", async (t) => {
  const f = await fixture(t);
  await f.login();
  for (const path of [
    "/.env",
    "/server/config.mjs",
    "/data/demo.sqlite",
    "/package.json",
  ])
    assert.equal((await f.call(path)).status, 404);
  assert.equal((await f.call("/")).status, 200);
});

test("home-screen manifest and exact public icon assets are served without caching", async (t) => {
  const f = await fixture(t);
  const response = await f.call("/manifest.webmanifest");
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type"),
    /application\/manifest\+json/,
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  const manifest = await response.json();
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.theme_color, "#0a0d12");
  for (const [url, size] of [
    ["/icons/apple-touch-icon.png", 180],
    ...manifest.icons.map((i) => [i.src, Number(i.sizes.split("x")[0])]),
  ]) {
    const icon = await f.call(url);
    assert.equal(icon.status, 200);
    assert.match(icon.headers.get("content-type"), /image\/png/);
    const bytes = Buffer.from(await icon.arrayBuffer());
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(bytes.readUInt32BE(16), size);
    assert.equal(bytes.readUInt32BE(20), size);
    assert.equal(bytes[25], 2, "Home-screen icons must be opaque RGB PNGs");
  }
  const svg = await f.call("/icons/icon.svg?v=fish-2");
  assert.equal(svg.status, 200);
  assert.match(svg.headers.get("content-type"), /image\/svg\+xml/);
  const html = await (await f.call("/")).text();
  assert.match(html, /rel="manifest"/);
  assert.match(html, /rel="apple-touch-icon"/);
  assert.match(html, /apple-mobile-web-app-capable/);
  await f.login();
  assert.equal((await f.call("/icons/other.png")).status, 404);
});

test("saved chat is authenticated, origin protected and survives fresh login", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.call("/api/conversations")).status, 401);
  await f.login();
  const id = "synthetic-conversation-test";
  const create = await f.call("/api/conversations", "POST", { id });
  assert.equal(create.status, 201);
  const send = await f.call(`/api/conversations/${id}/messages`, "POST", {
    requestId: "synthetic-request-one",
    revision: 0,
    question: "Summarize my budget",
    month: "2026-05",
  });
  assert.equal(send.status, 202);
  const read = await f.call(`/api/conversations/${id}`);
  assert.equal(read.headers.get("cache-control"), "no-store");
  assert.equal((await read.json()).turns[0].state, "completed");
  assert.equal(
    (
      await f.call(
        `/api/conversations/${id}/delete`,
        "POST",
        {},
        { Origin: "https://example.org" },
      )
    ).status,
    403,
  );
  await f.call("/api/logout", "POST", {});
  assert.equal((await f.call(`/api/conversations/${id}`)).status, 401);
  await f.login();
  assert.equal(
    (await (await f.call(`/api/conversations/${id}`)).json()).turns.length,
    1,
  );
});

for (const outcome of ["success", "rejected", "missing-key"]) {
  test(`cloud chat ${outcome}: authenticated config and durable sanitized result`, async (t) => {
    let calls = 0;
    const syntheticKey = "synthetic-http-api-key";
    const f = await fixture(
      t,
      {
        APP_MODE: "personal",
        APP_PASSWORD: "p".repeat(24),
        VAULT_KEY: "a".repeat(64),
        AI_PROVIDER: "openai",
        AI_API_KEY: outcome === "missing-key" ? "" : syntheticKey,
      },
      {
        aiFetch: async () => {
          calls++;
          return outcome === "success"
            ? Response.json({
                output: [
                  {
                    type: "message",
                    content: [
                      { type: "output_text", text: "Invented cloud answer" },
                    ],
                  },
                ],
              })
            : new Response(syntheticKey, { status: 401 });
        },
      },
    );
    await f.login();
    const state = await (await f.call("/api/state?month=2026-05")).text();
    assert.ok(!state.includes(syntheticKey));
    assert.equal(JSON.parse(state).providers.assistant.provider, "openai");
    const id = `synthetic-cloud-${outcome}`;
    await f.call("/api/conversations", "POST", { id });
    const send = await f.call(`/api/conversations/${id}/messages`, "POST", {
      requestId: `synthetic-request-${outcome}`,
      revision: 0,
      question: "Explain my budget",
      month: "2026-05",
    });
    assert.equal(send.status, outcome === "missing-key" ? 503 : 202);
    assert.equal(calls, outcome === "missing-key" ? 0 : 1);
    await new Promise((resolve) => setImmediate(resolve));
    const saved = await (await f.call(`/api/conversations/${id}`)).json();
    assert.ok(!JSON.stringify(saved).includes(syntheticKey));
    if (outcome !== "missing-key") {
      assert.equal(
        saved.turns[0].state,
        outcome === "success" ? "completed" : "failed",
      );
      assert.match(
        saved.turns[0].reply.answer,
        outcome === "success" ? /Invented cloud/ : /rejected access/,
      );
      await f.call("/api/logout", "POST", {});
      await f.login();
      assert.deepEqual(
        (await (await f.call(`/api/conversations/${id}`)).json()).turns,
        saved.turns,
      );
    }
  });
}

test("Goals APIs require a session and enforce revision checks without changing spending", async (t) => {
  const f = await fixture(t);
  assert.equal((await f.call("/api/goals")).status, 401);
  await f.login();
  const before = await (await f.call("/api/state?month=2026-05")).json();
  const state = await (await f.call("/api/goals")).json();
  const action = {
    action: "create",
    name: "Example purchase",
    kind: "purchase",
    target: "100",
    monthly: "0",
    revision: state.settings.revision,
    request_id: "test-goal-create-unique",
  };
  const first = await f.call("/api/goals/actions", "POST", action);
  assert.equal(first.status, 200);
  const id = (await first.json()).id;
  assert.equal(
    (await (await f.call("/api/goals/actions", "POST", action)).json()).id,
    id,
  );
  assert.equal(
    (
      await f.call("/api/goals/actions", "POST", {
        ...action,
        request_id: "test-goal-stale-unique",
      })
    ).status,
    409,
  );
  const after = await (await f.call("/api/state?month=2026-05")).json();
  assert.deepEqual(after.summary, before.summary);
  assert.equal((await f.call("/goals.js")).status, 200);
  assert.equal((await f.call("/goals.css")).status, 200);
});
