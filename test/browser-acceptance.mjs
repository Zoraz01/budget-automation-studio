// Synthetic, in-memory demo only. Requires an existing Playwright installation.
import assert from "node:assert/strict";
import { once } from "node:events";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.mjs";
import { configuration } from "../server/config.mjs";
import { openStore } from "../server/store.mjs";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const config = configuration({ APP_MODE: "demo" });
const store = openStore(":memory:", config.vaultKey, "USD");
store.seed("2026-05");
const server = createApp(config, store);
server.listen(0, "127.0.0.1");
await once(server, "listening");
config.port = server.address().port;
config.origin = `http://127.0.0.1:${config.port}`;
const output =
  process.env.BAS_TEST_OUTPUT || join(tmpdir(), "bas-salvage-browser");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const errors = [];
let fail = false,
  releaseOld = null,
  captureOld = null,
  oldUnauthorized = false;
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
  });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== config.origin) return route.abort();
    if (url.pathname !== "/api/state") return route.continue();
    if (fail)
      return route.fulfill({
        status: 500,
        json: { error: "Simulated unavailable data" },
      });
    const response = await route.fetch();
    if (!response.ok()) return route.fulfill({ response });
    const data = await response.json();
    if (captureOld && url.searchParams.get("month") === "2026-04") {
      captureOld();
      captureOld = null;
      await new Promise((resolve) => {
        releaseOld = resolve;
      });
      if (oldUnauthorized)
        return route
          .fulfill({ status: 401, json: { error: "Expired earlier request" } })
          .catch(() => {});
      data.summary.net_cents = 11100;
    } else data.summary.net_cents = 22200;
    return route.fulfill({ json: data }).catch(() => {});
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(config.origin);
  await page.getByRole("button", { name: "Explore the demo" }).click();
  await page.locator(".big").waitFor();
  await page.getByText("Build a 30-day cash plan", { exact: true }).click();
  const plan = page.locator("#cash-plan-form");
  await plan.locator("[name=cash]").fill("2000");
  const n = new Date();
  const local = new Date(n.getTime() - n.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  await plan.locator("[name=observed]").fill(local);
  await plan.locator("[name=buffer]").fill("200");
  await plan.locator("[name=reserve]").fill("100");
  await plan.locator("[name=daily]").fill("10");
  await plan.getByRole("button", { name: "Preview cash plan" }).click();
  await page
    .getByText(/Lowest projected headroom after reserves and buffer:.*1,400/)
    .waitFor();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `cash plan overflow at ${width}`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await plan.scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(output, "cash-plan.png") });

  for (const unauthorized of [false, true]) {
    oldUnauthorized = unauthorized;
    const oldStarted = new Promise((resolve) => {
      captureOld = resolve;
    });
    await page.locator("#month").fill("2026-04");
    await oldStarted;
    await page.getByRole("status").filter({ hasText: "Loading" }).waitFor();
    assert.equal(await page.locator(".big").count(), 0);
    await page.locator("#month").fill("2026-05");
    await page.locator(".big").filter({ hasText: "222.00" }).waitFor();
    releaseOld();
    await page.waitForTimeout(150);
    assert.equal(await page.locator("#month").inputValue(), "2026-05");
    assert.match(await page.locator(".big").innerText(), /222\.00/);
    assert.equal(await page.locator("#login-form").count(), 0);
  }
  fail = true;
  await page.locator("#month").fill("2026-06");
  await page
    .getByRole("alert")
    .filter({ hasText: "could not be loaded" })
    .waitFor();
  assert.equal(await page.locator(".big").count(), 0);
  await page.screenshot({ path: join(output, "failure.png"), fullPage: true });
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.locator(".big").waitFor();
  await page.locator("#month").fill("2026-05");
  await page.locator(".big").waitFor();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (const label of ["Home", "Activity", "Budgets", "Connect", "Ask BAS"]) {
      await page
        .getByRole("button", { name: label, exact: true })
        .first()
        .click();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${width} ${label} overflow`,
      );
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Home", exact: true }).first().click();
  await page.screenshot({ path: join(output, "home.png"), fullPage: true });
  const oldStarted = new Promise((resolve) => {
    captureOld = resolve;
  });
  await page.locator("#month").fill("2026-04");
  await oldStarted;
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.locator("#login-form").waitFor();
  releaseOld();
  await page.waitForTimeout(150);
  assert.equal(await page.locator("#login-form").count(), 1);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: delayed month responses, stale authorization, logout cancellation, failure/retry, 20 page/viewport checks; no page errors.",
  );
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  store.close();
}
