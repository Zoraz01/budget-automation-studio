import { mkdir, rm, cp, readFile, lstat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const target = resolve(root, ".site-dist");
// Exact reviewed marketing artifact. No app, configuration, database or environment copy.
export const siteFiles = [
  "index.html",
  "brand.html",
  "404.html",
  "styles.css",
  "_headers",
  "assets/fish.svg",
  "assets/wordmark.svg",
  "assets/social.svg",
  "assets/bas-home.jpg",
  "assets/bas-activity.jpg",
  "assets/bas-budgets.jpg",
  "assets/bas-mobile.jpg",
];
await rm(target, { recursive: true, force: true });
await mkdir(resolve(target, "assets"), { recursive: true });
for (const file of siteFiles) {
  const source = resolve(root, "docs/site", file);
  if (!(await lstat(source)).isFile())
    throw new Error("Static assets must be regular files");
  const buffer = await readFile(source);
  if (buffer.length > 1500000) throw new Error("Unexpected asset size");
  await cp(source, resolve(target, file));
}
console.log(
  `Built BAS static product site: ${siteFiles.length} reviewed files. No finance runtime included.`,
);
