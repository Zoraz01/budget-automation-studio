import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../docs/site/", import.meta.url));
let count = 0;
for (const file of (await readdir(root)).filter((name) =>
  name.endsWith(".html"),
)) {
  const html = await readFile(resolve(root, file), "utf8");
  if ((html.match(/<h1[ >]/g) || []).length !== 1)
    throw new Error(`${file}: expected one h1`);
  if (/<(?:script|iframe|form)[ >]/i.test(html))
    throw new Error(`${file}: unexpected active content`);
  for (const [, value] of html.matchAll(/(?:href|src)="([^" ]+)"/g)) {
    if (value.startsWith("https://")) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value))
      throw new Error(`${file}: unexpected URL scheme`);
    const [relative, fragment] = value.split("#");
    const target = resolve(
      relative.startsWith("/") ? root : dirname(resolve(root, file)),
      relative
        ? relative.endsWith("/")
          ? relative.replace(/^\//, "") + "index.html"
          : relative.replace(/^\//, "")
        : file,
    );
    if (!target.startsWith(root.endsWith(sep) ? root : root + sep))
      throw new Error("Link outside static site");
    const content = await readFile(target, "utf8");
    if (fragment && !content.includes(`id="${fragment}"`))
      throw new Error(`${file}: missing fragment ${fragment}`);
    count++;
  }
}
const fish = await readFile(
  new URL("../web/logo.svg", import.meta.url),
  "utf8",
);
if (
  fish.trim() !==
  (await readFile(resolve(root, "assets/fish.svg"), "utf8")).trim()
)
  throw new Error("Site fish differs from original artwork");
console.log(
  `BAS static site: local references valid (${count}); original fish preserved; no scripts, frames or forms.`,
);
