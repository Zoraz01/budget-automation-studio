import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  statSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";
import {
  configuredSettings,
  readSettings,
  saveSettings,
} from "../scripts/setup-ai.mjs";
const original =
  "# User configuration\nAPP_MODE=personal\nAPP_PASSWORD='synthetic-password'\nVAULT_KEY='synthetic-vault'\nPLAID_SECRET='synthetic-plaid'\nAI_PROVIDER=disabled\nOLLAMA_MODEL=fixture-local\n";
const choices = { provider: "openai", apiKey: "synthetic-ai-key" };
test("wizard picks a default model and preserves unrelated settings exactly", () => {
  const result = configuredSettings(original, choices);
  assert.ok(
    result.startsWith(original.slice(0, original.indexOf("AI_PROVIDER"))),
  );
  const env = parseEnv(result);
  assert.equal(env.APP_PASSWORD, "synthetic-password");
  assert.equal(env.VAULT_KEY, "synthetic-vault");
  assert.equal(env.PLAID_SECRET, "synthetic-plaid");
  assert.equal(env.AI_MODEL, "gpt-4.1-mini");
  assert.equal(env.AI_API_KEY, "synthetic-ai-key");
  assert.equal(env.OLLAMA_MODEL, "fixture-local");
  const switched = configuredSettings(result, { provider: "disabled" });
  assert.equal(parseEnv(switched).AI_API_KEY, "");
  assert.equal((switched.match(/^AI_PROVIDER=/gm) || []).length, 1);
});
test("wizard handles exported and multiline old entries without leftover key text", () => {
  const source =
    original + "export AI_API_KEY='old\nmultiline'\nAI_MODEL=old\n";
  const result = configuredSettings(source, choices);
  assert.ok(!result.includes("multiline"));
  assert.equal(parseEnv(result).AI_API_KEY, choices.apiKey);
});
test("wizard rejects invalid choices, injection and empty cloud/local credentials", () => {
  for (const choice of [
    { provider: "__proto__" },
    { provider: "openai" },
    { ...choices, apiKey: "bad\nAPP_MODE=demo" },
    { ...choices, model: "model'\nPORT=1" },
    { provider: "ollama" },
    { provider: "ollama", model: "fixture-cloud" },
  ])
    assert.throws(() => configuredSettings(original, choice));
});
test("settings save refuses missing/demo/symlink/changed files and writes private permissions", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "bas-ai-setup-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, ".env");
  assert.throws(() => readSettings(path), /setup first/);
  writeFileSync(path, "APP_MODE=demo\n");
  assert.throws(() => readSettings(path), /personal/);
  writeFileSync(path, original);
  assert.throws(
    () => saveSettings(path, original + "changed", "bad"),
    /changed/,
  );
  const next = configuredSettings(original, choices);
  saveSettings(path, original, next);
  assert.equal(readFileSync(path, "utf8"), next);
  if (process.platform !== "win32") {
    assert.equal(statSync(path).mode & 0o777, 0o600);
    const link = join(dir, "link");
    symlinkSync(path, link);
    assert.throws(() => readSettings(link), /regular file/);
  }
});

test("AI-like lines inside unrelated quoted settings remain unchanged", () => {
  const source =
    original + 'CUSTOM_PROMPT="keep\nAI_MODEL=embedded-text\nunchanged"\n';
  const result = configuredSettings(source, choices);
  assert.equal(parseEnv(result).CUSTOM_PROMPT, parseEnv(source).CUSTOM_PROMPT);
});
