import { spawnSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
if (process.argv.length !== 3 || process.argv[2] !== "--approved-preview")
  throw new Error(
    "Use --approved-preview after reviewing the static-site deployment.",
  );
if (!/^[a-f0-9]{32}$/.test(process.env.CLOUDFLARE_ACCOUNT_ID || ""))
  throw new Error(
    "Set the verified existing CLOUDFLARE_ACCOUNT_ID in your environment.",
  );
const config = JSON.parse(
  await readFile(resolve(root, "wrangler.jsonc"), "utf8"),
);
const allowed = ["name", "compatibility_date", "workers_dev", "assets"];
if (
  Object.keys(config).some((k) => !allowed.includes(k)) ||
  config.name !== "budget-automation-studio" ||
  config.workers_dev !== true ||
  JSON.stringify(config.assets) !==
    JSON.stringify({
      directory: "./.site-dist",
      not_found_handling: "404-page",
    })
)
  throw new Error(
    "Review changed deployment targets, routes or bindings separately.",
  );
const logs = resolve(root, ".private/wrangler-logs");
await mkdir(logs, { recursive: true, mode: 0o700 });
for (const args of [
  ["scripts/check-site.mjs"],
  ["scripts/build-site.mjs"],
  ["node_modules/wrangler/bin/wrangler.js", "deploy"],
]) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: {
      ...process.env,
      WRANGLER_SEND_METRICS: "false",
      WRANGLER_LOG_PATH: logs,
    },
    stdio: "inherit",
  });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
