import {
  lstatSync,
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
} from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseEnv } from "node:util";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import {
  AI_PROVIDERS,
  aiConfiguration,
} from "../server/providers/ai-config.mjs";

export function readSettings(path) {
  let stat;
  try {
    stat = lstatSync(path);
  } catch {
    throw new Error("Run npm run setup first to create your personal .env.");
  }
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error(".env must be a regular file, not a symbolic link.");
  const source = readFileSync(path, "utf8");
  if (parseEnv(source).APP_MODE !== "personal")
    throw new Error(
      "AI setup requires APP_MODE=personal. Demo mode never calls providers.",
    );
  return source;
}

export function configuredSettings(
  source,
  { provider, apiKey = "", model = "" },
) {
  if (!Object.hasOwn(AI_PROVIDERS, provider))
    throw new Error("Choose a listed AI provider.");
  apiKey = apiKey.trim();
  model = model.trim();
  if (
    AI_PROVIDERS[provider].cloud &&
    !/^[A-Za-z0-9._:/+=-]{8,2048}$/.test(apiKey)
  )
    throw new Error("Enter a valid API key without quotes or whitespace.");
  const settings = {
    AI_PROVIDER: provider,
    AI_API_KEY: AI_PROVIDERS[provider].cloud ? apiKey : "",
    AI_MODEL:
      provider === "disabled" ? "" : model || AI_PROVIDERS[provider].model,
  };
  const ai = aiConfiguration(settings, "personal");
  if (provider !== "disabled" && !ai.configured)
    throw new Error("Enter the exact local model name from ollama list.");
  // Remove whole dotenv entries, including quoted multiline values, without touching
  // passwords, vault keys, provider credentials, comments or unrelated settings.
  const entries =
    /^(?:[ \t]*export[ \t]+)?[ \t]*([A-Za-z_][A-Za-z0-9_]*)[ \t]*=[ \t]*(?:"[^"]*"|'[^']*'|[^\r\n]*)[^\r\n]*(?:\r?\n|$)/gm;
  const kept = source
    .replace(entries, (entry, key) =>
      Object.hasOwn(settings, key) ? "" : entry,
    )
    .trimEnd();
  return (
    kept +
    "\n" +
    Object.entries(settings)
      .map(([key, value]) => `${key}='${value}'`)
      .join("\n") +
    "\n"
  );
}

export function saveSettings(path, original, next) {
  if (readSettings(path) !== original)
    throw new Error(
      ".env changed during setup. Run setup again to preserve those changes.",
    );
  const temporary = `${path}.ai-${randomBytes(8).toString("hex")}.tmp`;
  try {
    writeFileSync(temporary, next, { mode: 0o600, flag: "wx" });
    renameSync(temporary, path);
  } finally {
    try {
      unlinkSync(temporary);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

async function prompt(label, hidden = false) {
  process.stdout.write(label);
  const output = hidden
    ? new Writable({
        write(_chunk, _encoding, done) {
          done();
        },
      })
    : process.stdout;
  const readline = createInterface({
    input: process.stdin,
    output,
    terminal: true,
  });
  const abort = new AbortController();
  readline.on("SIGINT", () => abort.abort());
  try {
    return await readline.question("", { signal: abort.signal });
  } finally {
    readline.close();
    if (hidden) process.stdout.write("\n");
  }
}

export async function setupAI() {
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error(
      "Run npm run setup:ai in an interactive terminal, or edit .env using docs/SETUP.md. Never pass a key on the command line.",
    );
  const path = resolve(".env");
  const source = readSettings(path);
  console.log(
    "Choose your AI provider. Cloud chat sends your question and budget aggregates to that provider. API billing/model access must be enabled on your account.",
  );
  const choices = Object.keys(AI_PROVIDERS);
  choices.forEach((key, index) =>
    console.log(`${index + 1}. ${AI_PROVIDERS[key].label}`),
  );
  const selection = (await prompt("Provider number or name: "))
    .trim()
    .toLowerCase();
  const provider = choices[Number(selection) - 1] || selection;
  if (!Object.hasOwn(AI_PROVIDERS, provider))
    throw new Error("Choose a listed provider and run setup again.");
  const definition = AI_PROVIDERS[provider];
  const apiKey = definition.cloud
    ? await prompt("API key (hidden): ", true)
    : "";
  const model =
    provider !== "disabled"
      ? await prompt(
          `Model${definition.model ? ` [${definition.model}]` : " (from ollama list)"}: `,
        )
      : "";
  saveSettings(
    path,
    source,
    configuredSettings(source, { provider, apiKey, model }),
  );
  console.log(
    `Saved ${definition.label} settings privately. Restart BAS with npm start, then open Connect or Assistant. No provider request was made during setup.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    await setupAI();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
