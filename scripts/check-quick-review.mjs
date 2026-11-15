// Standalone synthetic design checks. Never starts the finance server or loads .env.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
const network = [];
page.on("pageerror", (error) => errors.push(error.message));
await context.route(/^https?:/, (route) => {
  network.push(route.request().url());
  return route.abort();
});
const url = pathToFileURL(resolve(root, "docs/design/quick-review.html")).href;
const count = (n) =>
  page
    .locator(".review-heading small")
    .filter({ hasText: `${n} purchase` })
    .waitFor();
const approve = () =>
  page.getByRole("button", { name: "Approve", exact: true }).click();
const editor = page.locator("#review-editor");
const output = resolve(
  process.env.DESIGN_OUTPUT || resolve(root, "docs/design"),
);
const rect = async (container, selector) =>
  page.evaluate(
    ({ container, selector }) => {
      const pane = document.querySelector(container).getBoundingClientRect();
      const parts = [...document.querySelectorAll(selector)].map((element) =>
        element.getBoundingClientRect(),
      );
      const left = Math.min(...parts.map((part) => part.left));
      const top = Math.min(...parts.map((part) => part.top));
      const right = Math.max(...parts.map((part) => part.right));
      const bottom = Math.max(...parts.map((part) => part.bottom));
      const part = {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      };
      return {
        x: ((part.x - pane.x) / pane.width) * 100,
        y: ((part.y - pane.y) / pane.height) * 100,
        w: (part.width / pane.width) * 100,
        h: (part.height / pane.height) * 100,
      };
    },
    { container, selector },
  );

try {
  let before;
  let after;
  if (process.env.CAPTURE_DESIGN === "1") {
    await mkdir(output, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(
      pathToFileURL(resolve(root, "docs/design/mobile-concept.html")).href +
        "#review",
    );
    await page.locator("#main h1").waitFor();
    await page.addStyleTag({
      content:
        ".top, #nav, .design-bar, .notes { display: none !important; } .phone { margin: 0 !important; }",
    });
    before = await rect(
      "#main",
      "#main > .card > .form-grid, #main > .card > .form-actions",
    );
    await page.locator("#main").screenshot({
      path: resolve(output, "quick-review-before.jpg"),
      type: "jpeg",
      quality: 84,
    });
  }
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(url);
    await count(3);
    assert.equal(
      await page
        .locator("#quick-review-main input, #quick-review-main select")
        .count(),
      0,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      `overflow at ${width}`,
    );
    for (const label of ["Edit", "Approve"]) {
      const box = await page
        .getByRole("button", { name: label, exact: true })
        .boundingBox();
      assert.ok(
        box.height >= 44 && box.width >= 44 && box.y + box.height <= 844,
        `${label} not reachable at ${width}`,
      );
    }
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    assert.equal(await editor.evaluate((element) => element.open), true);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
      `editor overflow at ${width}`,
    );
    await page.keyboard.press("Escape");
    assert.equal(await editor.evaluate((element) => element.open), false);
    assert.equal(
      await page.evaluate(() => document.activeElement.textContent),
      "Edit",
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  if (process.env.CAPTURE_DESIGN === "1") {
    after = await rect("#quick-review-main", ".review-facts, .review-actions");
    await page.locator("#quick-review-main").screenshot({
      path: resolve(output, "quick-review-after.jpg"),
      type: "jpeg",
      quality: 84,
    });
    console.log(JSON.stringify({ before, after }));
  }
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await editor.getByLabel("Amount", { exact: true }).fill("99.99");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  assert.equal(await page.locator(".review-amount").textContent(), "$84.00");
  await count(3);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await editor.getByLabel("Amount", { exact: true }).fill("84.27");
  await editor
    .getByLabel("Category", { exact: true })
    .selectOption("Groceries");
  await editor
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await count(3);
  assert.equal(await page.locator(".review-amount").textContent(), "$84.27");
  assert.match(await page.locator(".review-facts").textContent(), /Groceries/);
  await approve();
  await count(2);
  assert.equal(await editor.evaluate((element) => element.open), false);
  assert.equal(
    await page.locator(".review-summary h2").textContent(),
    "Corner Market",
  );
  assert.match(
    await page.locator(".review-status").textContent(),
    /84\.27.*Groceries/,
  );
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await editor
    .getByLabel("Description", { exact: true })
    .fill("Corrected market");
  await editor.getByLabel("Amount", { exact: true }).fill("62.99");
  await editor
    .getByLabel("Account", { exact: true })
    .selectOption("Example checking");
  await editor.getByLabel("Transfer between my own accounts").check();
  await editor
    .getByRole("button", { name: "Save & approve", exact: true })
    .click();
  await count(1);
  assert.match(
    await page.locator(".review-status").textContent(),
    /Corrected market.*62\.99.*Transfer/,
  );
  assert.match(
    await page.locator(".review-summary").textContent(),
    /Approval alone does not link it/,
  );
  await approve();
  await page
    .getByRole("heading", { name: "All reviewed", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Restart demo", exact: true }).click();
  await count(3);
  await page
    .getByRole("button", { name: "Bulk approval", exact: true })
    .click();
  assert.equal(await editor.locator("li").count(), 2);
  await page.keyboard.press("Escape");
  await count(3);
  await page
    .getByRole("button", { name: "Bulk approval", exact: true })
    .click();
  await editor
    .getByRole("button", { name: "Approve 2 purchases", exact: true })
    .click();
  await count(1);
  assert.equal(
    await page.locator(".review-summary h2").textContent(),
    "Clothing refund",
  );
  await page.locator(".review-options summary").click();
  await page
    .getByRole("button", { name: "Reject purchase", exact: true })
    .click();
  await count(1);
  await editor
    .getByRole("button", { name: "Confirm rejection", exact: true })
    .click();
  await count(0);
  assert.deepEqual(network, []);
  assert.deepEqual(errors, []);
  console.log(
    "Quick review passed: 4 widths, direct approval, editor cancel/save/approve, exact cents, transfer, bulk and refund/reject checks. No network requests.",
  );
} finally {
  await context.close();
  await browser.close();
}
