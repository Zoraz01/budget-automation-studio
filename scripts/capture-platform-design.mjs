// Optional design QA. Serves only docs/design; never starts the application/API.
// Install Playwright separately or set PLAYWRIGHT_MODULE to its ESM entry file.
import { createServer } from "node:http";
import { readFile, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, dirname, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../docs/design");
const output = process.env.DESIGN_CAPTURE_DIR
  ? resolve(process.env.DESIGN_CAPTURE_DIR)
  : await mkdtemp(resolve(tmpdir(), "platform-design-"));
await mkdir(output, { recursive: true });
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".jpg": "image/jpeg",
};
const server = createServer(async (req, res) => {
  try {
    const file = resolve(
      root,
      "." + new URL(req.url, "http://localhost").pathname,
    );
    if (!file.startsWith(root + sep) || !types[extname(file)]) throw Error();
    const bytes = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] });
    res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
await new Promise((done, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", done);
});
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const checks = [];
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ colorScheme: "dark" });
  let errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) =>
    route
      .request()
      .url()
      .startsWith(origin + "/")
      ? route.continue()
      : route.abort(),
  );
  for (const variant of ["a", "b", "c"]) {
    for (const width of [320, 390, 768, 1440]) {
      errors = [];
      await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
      await page.goto(`${origin}/platform-${variant}.html`, {
        waitUntil: "networkidle",
      });
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        smallTargets: [...document.querySelectorAll("a, summary")]
          .filter((element) => element.getBoundingClientRect().height < 44)
          .map((element) => element.textContent.trim()),
      }));
      checks.push({ variant, width, ...result, errors: [...errors] });
      if (width === 390 || width === 1440)
        await page.screenshot({
          path: resolve(
            output,
            `platform-${variant}-${width === 390 ? "mobile" : "desktop"}.jpg`,
          ),
          type: "jpeg",
          quality: 76,
          fullPage: true,
        });
    }
  }
  await writeFile(
    resolve(output, "layout-checks.json"),
    JSON.stringify(checks, null, 2),
  );
  if (
    checks.some(
      (check) =>
        check.overflow || check.smallTargets.length || check.errors.length,
    )
  )
    throw Error("Design layout checks failed; inspect layout-checks.json");
  console.log(`Passed ${checks.length} layout checks. Captures: ${output}`);
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}
