import { execFileSync } from "node:child_process";
import { readFileSync, lstatSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
const roots = ["server", "web", "scripts", "test", "docs", ".github"];
const rootFiles = new Set([
  "README.md",
  "AGENTS.md",
  "LICENSE",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "package.json",
  "package-lock.json",
  ".gitignore",
  ".gitattributes",
  ".env.example",
  ".nvmrc",
]);
const violations = [];
// In a checkout, scan index bytes too: unstaged cleanup cannot hide a staged leak.
let tracked;
try {
  const top = execFileSync(
    "git",
    ["-c", "core.fsmonitor=false", "rev-parse", "--show-toplevel"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  ).trim();
  if (resolve(top) === process.cwd())
    tracked = execFileSync(
      "git",
      ["-c", "core.fsmonitor=false", "ls-files", "-z"],
      { encoding: "utf8" },
    )
      .split("\0")
      .filter(Boolean);
} catch {}
function files(dir = ".") {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if ([".git", "node_modules", "data"].includes(e.name)) return [];
    const path = dir === "." ? e.name : `${dir}/${e.name}`;
    if (e.isSymbolicLink()) {
      violations.push(`${path}: symbolic link`);
      return [];
    }
    return e.isDirectory() ? files(path) : [path];
  });
}
if (tracked?.length === 0) tracked = undefined;
const paths = tracked || files();
const patterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  [
    "GitHub token",
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/,
  ],
  [
    "provider token",
    /\baccess-(?:sandbox|production|development)-[0-9a-f-]{30,}\b/,
  ],
  ["API token", /\bsk-(?:ant-)?[A-Za-z0-9_-]{28,}\b/],
  ["AWS access key", /\bAKIA[A-Z0-9]{16}\b/],
  ["machine-specific path", /\/(?:Users|Volumes|home)\/[A-Za-z0-9_.-]+\//],
  ["credential in URL", /https?:\/\/[^\s/:]+:[^\s/@]+@/],
];
function check(path, buffer, label) {
  if (buffer.length > 1500000) violations.push(`${path}: oversized artifact`);
  if (path.endsWith(".png")) {
    if (
      ![
        "web/icons/apple-touch-icon.png",
        "web/icons/icon-192.png",
        "web/icons/icon-512.png",
      ].includes(path)
    )
      violations.push(`${path}: unapproved PNG`);
    if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a")
      violations.push(`${path}: invalid PNG`);
    return;
  }
  if (path.endsWith(".jpg")) {
    if (
      ![
        "docs/dashboard.jpg",
        "docs/mobile.jpg",
        "docs/mobile-budgets.jpg",
        "docs/mobile-transactions.jpg",
        "docs/mobile-assistant.jpg",
        "docs/mobile-connections.jpg",
      ].includes(path)
    )
      violations.push(`${path}: unapproved binary`);
    if (buffer.subarray(0, 3).toString("hex") !== "ffd8ff")
      violations.push(`${path}: invalid JPEG`);
    return;
  }
  if (buffer.includes(0)) violations.push(`${path}: binary file`);
  const content = buffer.toString("utf8");
  for (const [name, re] of patterns)
    if (re.test(content)) violations.push(`${path} (${label}): ${name}`);
  if (path === ".env.example")
    for (const line of content.split("\n"))
      if (
        /^(?:APP_PASSWORD|VAULT_KEY|PLAID_CLIENT_ID|PLAID_SECRET|SNAPTRADE_CLIENT_ID|SNAPTRADE_CONSUMER_KEY)=.+/.test(
          line,
        )
      )
        violations.push(`${path}: populated credential field`);
}
for (const path of paths) {
  if (!rootFiles.has(path) && !roots.some((r) => path.startsWith(`${r}/`)))
    violations.push(`${path}: outside release allowlist`);
  if (
    /(^|\/)(?:\.env(?!\.example$)|data|node_modules)(\/|$)|\.(?:sqlite|db|log|pem|key)(?:$|[.-])/.test(
      path,
    )
  )
    violations.push(`${path}: private/runtime file`);
  if (
    !rootFiles.has(path) &&
    !/^.+\.(?:mjs|js|css|html|svg|md|yml|jpg|png|webmanifest)$/.test(path)
  )
    violations.push(`${path}: unapproved extension`);
  if (tracked)
    check(
      path,
      execFileSync("git", ["-c", "core.fsmonitor=false", "show", `:${path}`], {
        maxBuffer: 2e6,
      }),
      "index",
    );
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) violations.push(`${path}: symbolic link`);
  else check(path, readFileSync(path), "working tree");
}
if (violations.length) {
  console.error([...new Set(violations)].join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Release-content checks passed for ${paths.length} files. Screenshots and private-data provenance still require human review.`,
  );
