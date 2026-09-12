import test from "node:test";
import assert from "node:assert/strict";
import { configuration } from "../server/config.mjs";
import { aiStatus } from "../server/providers/ai-config.mjs";
import { answer, AIError } from "../server/providers/ai.mjs";
const env = {
  APP_MODE: "personal",
  APP_PASSWORD: "p".repeat(24),
  VAULT_KEY: "a".repeat(64),
  AI_API_KEY: "synthetic-only-api-key",
};
const summary = {
  month: "2026-05",
  income_cents: 10000,
  spent_cents: 1000,
  net_cents: 9000,
  unreviewed_count: 0,
  pending_count: 0,
  categories: [
    {
      name: "Invented category",
      spent_cents: 1000,
      limit_cents: 2000,
      private_id: "excluded-id",
    },
  ],
  transactions: [{ description: "excluded-merchant" }],
  secret: "excluded-secret",
};
const results = {
  openai: {
    status: "completed",
    output: [
      { type: "reasoning" },
      {
        type: "message",
        content: [
          { type: "output_text", text: "Budget answer" },
          { type: "output_text", text: "Second part" },
        ],
      },
    ],
  },
  anthropic: {
    content: [
      { type: "thinking", thinking: "hidden" },
      { type: "text", text: "Budget answer" },
    ],
  },
  gemini: {
    candidates: [
      {
        content: {
          parts: [{ thought: true, text: "hidden" }, { text: "Budget answer" }],
        },
        finishReason: "STOP",
      },
    ],
  },
};
const endpoints = {
  openai: "https://api.openai.com/v1/responses",
  anthropic: "https://api.anthropic.com/v1/messages",
  gemini:
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
};
for (const provider of Object.keys(results)) {
  test(`${provider}: default model, server-only key, aggregate request and text response`, async () => {
    const config = configuration({ ...env, AI_PROVIDER: provider });
    let calls = 0;
    const reply = await answer(
      "Explain my budget",
      summary,
      config,
      async (url, options) => {
        calls++;
        assert.equal(url, endpoints[provider]);
        assert.equal(options.redirect, "error");
        assert.ok(options.signal instanceof AbortSignal);
        const body = JSON.parse(options.body);
        for (const excluded of [
          env.AI_API_KEY,
          "excluded-merchant",
          "excluded-secret",
          "excluded-id",
        ])
          assert.ok(!options.body.includes(excluded));
        assert.match(options.body, /Invented category/);
        assert.match(options.body, /Explain my budget/);
        assert.ok(!body.tools);
        if (provider === "openai") {
          assert.equal(body.store, false);
          assert.equal(
            options.headers.Authorization,
            `Bearer ${env.AI_API_KEY}`,
          );
        }
        if (provider === "anthropic") {
          assert.equal(options.headers["x-api-key"], env.AI_API_KEY);
          assert.equal(options.headers["anthropic-version"], "2023-06-01");
        }
        if (provider === "gemini")
          assert.equal(options.headers["x-goog-api-key"], env.AI_API_KEY);
        return Response.json(results[provider]);
      },
    );
    assert.equal(calls, 1);
    assert.equal(reply.mode, provider);
    assert.ok(reply.model);
    assert.match(reply.answer, /Budget answer/);
    assert.ok(!reply.answer.includes("hidden"));
    assert.ok(!JSON.stringify(aiStatus(config)).includes(env.AI_API_KEY));
  });
  test(`${provider}: demo cannot make a provider request with ambient keys`, async () => {
    const config = configuration({
      ...env,
      AI_PROVIDER: provider,
      APP_MODE: "demo",
    });
    assert.equal(config.ai, false);
    const reply = await answer("cash flow", summary, config, () => {
      throw Error("Network forbidden");
    });
    assert.equal(reply.mode, "summary");
  });
}
test("selected cloud without a key fails clearly instead of pretending to be AI", async () => {
  const config = configuration({
    ...env,
    AI_PROVIDER: "openai",
    AI_API_KEY: "",
  });
  assert.equal(config.ai, false);
  await assert.rejects(
    answer("hello", summary, config, () => {
      throw Error("No network");
    }),
    /setup:ai/,
  );
  assert.throws(() => configuration({ ...env, AI_PROVIDER: "__proto__" }));
  assert.throws(() =>
    configuration({
      ...env,
      AI_PROVIDER: "gemini",
      AI_MODEL: "model?key=unsafe",
    }),
  );
  assert.equal(
    configuration({
      ...env,
      AI_API_KEY: "",
      AI_PROVIDER: "anthropic",
      ANTHROPIC_API_KEY: "fixture-provider-key",
    }).assistant.apiKey,
    "fixture-provider-key",
  );
});
test("provider failures are actionable, sanitized and never automatically retried", async () => {
  const config = configuration({ ...env, AI_PROVIDER: "openai" });
  for (const [status, expected] of [
    [401, /rejected access/],
    [403, /rejected access/],
    [429, /billing/],
    [404, /AI_MODEL/],
    [500, /unavailable/],
  ]) {
    let calls = 0;
    await assert.rejects(
      answer("hello", summary, config, async () => {
        calls++;
        return new Response(`Raw secret ${env.AI_API_KEY}`, { status });
      }),
      (error) =>
        error instanceof AIError &&
        expected.test(error.message) &&
        !error.message.includes(env.AI_API_KEY),
    );
    assert.equal(calls, 1);
  }
  await assert.rejects(
    answer("hello", summary, config, async () => {
      throw Error(env.AI_API_KEY);
    }),
    /connectivity/,
  );
  for (const result of [
    null,
    {},
    {
      output: [
        {
          type: "message",
          content: [{ type: "refusal", refusal: "declined" }],
        },
      ],
    },
  ])
    await assert.rejects(
      answer("hello", summary, config, async () => Response.json(result)),
      /no usable answer/,
    );
  const partial = await answer("hello", summary, config, async () =>
    Response.json({ ...results.openai, status: "incomplete" }),
  );
  assert.match(partial.answer, /shortened/);
});
