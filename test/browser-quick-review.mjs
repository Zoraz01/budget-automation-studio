// A separate in-memory demo. No personal environment, database or provider access.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp } from "../server/app.mjs";
import { configuration } from "../server/config.mjs";
import { openStore } from "../server/store.mjs";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const config = configuration({ APP_MODE: "demo" });
const store = openStore(":memory:", config.vaultKey, "USD");
store.seed("2026-05");
function reset() {
  store.db
    .prepare("DELETE FROM transactions WHERE id LIKE 'quick-demo-%'")
    .run();
  for (const [index, description, amount, category] of [
    [1, "Neighborhood Kitchen", 8400, "dining"],
    [2, "Corner Market", 6200, "food"],
    [3, "Sample subscription", 1200, "lifestyle"],
  ]) {
    store.db
      .prepare(
        "INSERT INTO transactions (id,source,date,description,amount_cents,currency,category_id,reviewed) VALUES (?,'demo',?,?,?,'USD',?,0)",
      )
      .run(
        `quick-demo-${index}`,
        `2026-05-${15 - index}`,
        description,
        amount,
        category,
      );
  }
}
reset();
const server = createApp(config, store);
await new Promise((done) => server.listen(0, "127.0.0.1", done));
config.port = server.address().port;
config.origin = `http://127.0.0.1:${config.port}`;
const output =
  process.env.BAS_TEST_OUTPUT || join(tmpdir(), "bas-quick-review");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
let writes = [],
  failWrite = false,
  expireReview = false,
  failState = false,
  releaseApproval = null,
  captureApproval = null;
const errors = [];
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await context.route("**/*", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.origin !== config.origin) return route.abort();
    if (url.pathname === "/api/state" && failState)
      return route.fulfill({
        status: 500,
        json: { error: "Review read failed" },
      });
    if (url.pathname === "/api/transactions/review") {
      writes.push(request.postDataJSON());
      if (expireReview)
        return route.fulfill({
          status: 401,
          json: { error: "Session expired" },
        });
      if (failWrite) {
        failWrite = false;
        return route.fulfill({
          status: 500,
          json: { error: "Simulated review failure" },
        });
      }
      if (captureApproval) {
        captureApproval();
        captureApproval = null;
        await new Promise((done) => {
          releaseApproval = done;
        });
      }
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(config.origin);
  await page.getByRole("button", { name: "Explore the demo" }).click();
  await page.locator("#month").fill("2026-05");
  await page.getByRole("button", { name: "Start review", exact: true }).click();
  const approve = () =>
    page.getByRole("button", { name: "Approve", exact: true });
  const edit = () => page.getByRole("button", { name: "Edit", exact: true });
  const editor = page.locator("#editor");
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const box = await approve().boundingBox();
    assert.ok(
      box.height >= 44 && box.y + box.height <= 844,
      `Approve not in initial view at ${width}`,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    if (width < 700) {
      const nav = await page.locator(".nav").boundingBox();
      assert.ok(
        box.y + box.height <= nav.y,
        "Approve is covered by phone navigation",
      );
    }
    await edit().click();
    await editor
      .getByLabel("Description", { exact: true })
      .fill("Discard this draft");
    await page.keyboard.press("Escape");
    assert.equal(await editor.evaluate((element) => element.open), false);
    assert.equal(
      store.db
        .prepare("SELECT description FROM transactions WHERE id='quick-demo-1'")
        .get().description,
      "Neighborhood Kitchen",
    );
  }
  assert.equal(writes.length, 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await edit().click();
  await editor.getByLabel("Amount (USD)", { exact: true }).fill("84.27");
  await editor.getByLabel("Category", { exact: true }).selectOption("food");
  await editor
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await page.locator(".review-amount").filter({ hasText: "84.27" }).waitFor();
  assert.equal(
    store.db
      .prepare("SELECT reviewed FROM transactions WHERE id='quick-demo-1'")
      .get().reviewed,
    0,
  );
  assert.equal(writes.length, 1);
  assert.equal(writes[0].approve, false);
  const started = new Promise((done) => {
    captureApproval = done;
  });
  await approve().evaluate((element) => {
    element.click();
    element.click();
  });
  await started;
  assert.equal(writes.length, 2);
  assert.equal(writes[1].edits, undefined);
  releaseApproval();
  await page
    .locator(".review-purchase h2")
    .filter({ hasText: "Corner Market" })
    .waitFor();
  assert.equal(
    store.db
      .prepare("SELECT reviewed FROM transactions WHERE id='quick-demo-1'")
      .get().reviewed,
    1,
  );
  assert.equal(await page.locator("#notice").textContent(), "");
  assert.match(
    await page.locator(".page-head p").textContent(),
    /Purchase approved/,
  );
  const nextBox = await approve().boundingBox();
  assert.ok(
    nextBox.y + nextBox.height <= (await page.locator(".nav").boundingBox()).y,
  );
  await edit().click();
  await editor
    .getByLabel("Description", { exact: true })
    .fill("Corrected market");
  await editor.getByLabel("Amount (USD)", { exact: true }).fill("-0.27");
  failWrite = true;
  await editor
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await editor
    .getByRole("alert")
    .filter({ hasText: "Simulated review failure" })
    .waitFor();
  assert.equal(
    await editor.getByLabel("Description", { exact: true }).inputValue(),
    "Corrected market",
  );
  assert.equal(
    store.db
      .prepare("SELECT description FROM transactions WHERE id='quick-demo-2'")
      .get().description,
    "Corner Market",
  );
  await editor
    .getByRole("button", { name: "Save & approve", exact: true })
    .click();
  await page
    .locator(".review-purchase h2")
    .filter({ hasText: "Sample subscription" })
    .waitFor();
  const corrected = store.db
    .prepare("SELECT * FROM transactions WHERE id='quick-demo-2'")
    .get();
  assert.equal(corrected.amount_cents, -27);
  assert.equal(corrected.reviewed, 1);
  failWrite = true;
  await approve().click();
  await page
    .getByRole("button", { name: "Refresh status", exact: true })
    .waitFor();
  assert.equal(await approve().isDisabled(), true);
  failState = true;
  await page
    .getByRole("button", { name: "Refresh status", exact: true })
    .click();
  await page.getByRole("button", { name: "Retry", exact: true }).waitFor();
  assert.equal(await page.locator(".review-approve").count(), 0);
  failState = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await approve().waitFor();
  await page.waitForFunction(() => {
    const button = document.querySelector(".review-approve");
    return button && !button.disabled;
  });
  await approve().click();
  await page
    .getByRole("heading", { name: "All reviewed", exact: true })
    .waitFor();
  reset();
  await page.getByRole("button", { name: "Home", exact: true }).first().click();
  await page.getByRole("button", { name: "Start review", exact: true }).click();
  await page.locator("#search").focus();
  await page.keyboard.type("Nothing matches this invented search");
  assert.equal(
    await page.locator("#search").inputValue(),
    "Nothing matches this invented search",
  );
  await page
    .getByRole("heading", { name: "No matches", exact: true })
    .waitFor();
  await page.locator("#search").fill("");
  await page.getByRole("heading", { name: "Review", exact: true }).click();
  for (const [width, name] of [
    [390, "mobile"],
    [1280, "desktop"],
  ]) {
    await page.setViewportSize({ width, height: 844 });
    await page.screenshot({
      path: join(output, `review-${name}.jpg`),
      fullPage: true,
      quality: 86,
    });
  }
  // Choosing a category in All activity saves it but does not approve it.
  await page.getByRole("button", { name: "All activity", exact: true }).click();
  await page.locator('[data-transaction="quick-demo-1"]').selectOption("food");
  await page
    .getByRole("status")
    .filter({ hasText: "Approval is still required" })
    .waitFor();
  assert.equal(
    store.db
      .prepare("SELECT reviewed FROM transactions WHERE id='quick-demo-1'")
      .get().reviewed,
    0,
  );
  await page.getByRole("button", { name: /Needs review/ }).click();
  await edit().click();
  await editor
    .getByLabel("Description", { exact: true })
    .fill("Temporary demo draft");
  expireReview = true;
  await editor
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await page.locator("#login-form").waitFor();
  assert.equal(await editor.evaluate((element) => element.open), false);
  assert.equal(await editor.locator("input").count(), 0);
  assert.equal(await page.locator(".review-purchase").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: BAS direct approval, edit/cancel/save/approve, duplicate guard, retained failed draft, status recovery, filtered empty state, no approval on category change and four responsive widths. Separate in-memory demo.",
  );
} finally {
  if (releaseApproval) releaseApproval();
  await browser.close();
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
  store.close();
}
