const origin = new URL(process.argv[2] || "http://127.0.0.1:4311/");
if (
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash ||
  origin.username ||
  origin.password ||
  !["https:", "http:"].includes(origin.protocol) ||
  (origin.protocol === "http:" && origin.hostname !== "127.0.0.1")
)
  throw new Error("Use an HTTPS site origin or loopback preview.");
for (const path of [
  "/",
  "/brand.html",
  "/assets/fish.svg",
  "/assets/bas-home.jpg",
  "/assets/bas-activity.jpg",
  "/assets/bas-budgets.jpg",
  "/assets/bas-mobile.jpg",
]) {
  let response = await fetch(new URL(path, origin), { redirect: "manual" });
  if (path.endsWith(".html") && [301, 307, 308].includes(response.status)) {
    const destination = new URL(response.headers.get("location"), origin);
    if (
      destination.origin !== origin.origin ||
      destination.pathname !== path.slice(0, -5)
    )
      throw new Error("Unexpected HTML redirect");
    response = await fetch(destination, { redirect: "manual" });
  }
  if (response.status !== 200) throw new Error(`${path}: ${response.status}`);
  if (path.endsWith(".jpg")) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if ([...bytes.slice(0, 3)].join(",") !== "255,216,255")
      throw new Error("Invalid JPEG asset");
  } else if (path === "/") {
    const html = await response.text();
    if (
      !html.includes("Find your") ||
      !html.includes("financial flow.") ||
      html.includes("<script")
    )
      throw new Error("Unexpected product page");
  }
  if (origin.protocol === "https:")
    for (const [name, value] of [
      ["x-content-type-options", "nosniff"],
      ["referrer-policy", "no-referrer"],
      ["x-robots-tag", "noindex, nofollow"],
    ])
      if (response.headers.get(name) !== value)
        throw new Error(`Missing ${name}`);
  console.log(`${path}: 200`);
}
for (const path of ["/.env", "/api/state", "/not-a-real-page"]) {
  const response = await fetch(new URL(path, origin), { redirect: "manual" });
  if (response.status !== 404) throw new Error(`${path}: expected 404`);
  console.log(`${path}: 404`);
}
console.log(
  "BAS static product page and assets verified. This does not deploy the finance application.",
);
