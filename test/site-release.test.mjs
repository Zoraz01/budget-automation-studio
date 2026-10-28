import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtemp,
  cp,
  writeFile,
  rm,
  readdir,
  readFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const root = new URL("../", import.meta.url);
test("marketing artifact includes no finance runtime or environment data", async () => {
  const sentinel = "PRIVATE_TEST_VALUE_DO_NOT_PUBLISH";
  const run = spawnSync(process.execPath, ["scripts/build-site.mjs"], {
    cwd: root,
    env: { ...process.env, APP_PASSWORD: sentinel, PLAID_SECRET: sentinel },
    encoding: "utf8",
  });
  assert.equal(run.status, 0, run.stderr);
  const files = await readdir(new URL("../.site-dist/", import.meta.url));
  assert(!files.some((f) => /server|web|data|env|config|api/.test(f)));
  assert(
    !(
      await readFile(
        new URL("../.site-dist/index.html", import.meta.url),
        "utf8",
      )
    ).includes(sentinel),
  );
  assert(files.includes("404.html"));
});
test("static publishing requires explicit approval and verified account setting before cloud calls", () => {
  for (const args of [[], ["--approved-preview"]]) {
    const run = spawnSync(
      process.execPath,
      ["scripts/deploy-site.mjs", ...args],
      {
        cwd: root,
        env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: "" },
        encoding: "utf8",
      },
    );
    assert.notEqual(run.status, 0);
    assert(!run.stdout.includes("wrangler"));
    assert.match(
      run.stderr,
      args.length ? /verified existing/ : /approved-preview/,
    );
  }
});
test("a domain route cannot be smuggled into the static preview deployment", async () => {
  const temp = await mkdtemp(join(tmpdir(), "bas-publish-"));
  try {
    // The script normally lives one directory below its config.
    const scripts = join(temp, "scripts");
    await import("node:fs/promises").then((fs) => fs.mkdir(scripts));
    await cp(
      new URL("../scripts/deploy-site.mjs", import.meta.url),
      join(scripts, "deploy-site.mjs"),
    );
    await writeFile(
      join(temp, "wrangler.jsonc"),
      JSON.stringify({
        name: "budget-automation-studio",
        workers_dev: true,
        assets: { directory: "./.site-dist", not_found_handling: "404-page" },
        routes: ["unexpected.invalid/*"],
      }),
    );
    const run = spawnSync(
      process.execPath,
      [join(scripts, "deploy-site.mjs"), "--approved-preview"],
      {
        cwd: temp,
        env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: "a".repeat(32) },
        encoding: "utf8",
      },
    );
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /Review changed deployment targets/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
