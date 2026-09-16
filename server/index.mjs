import { seedGoalDemo } from "./goals-demo.mjs";
import { workspaceGoals } from "./goals-adapter.mjs";
import { configuration } from "./config.mjs";
import { openStore } from "./store.mjs";
import { createApp } from "./app.mjs";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
process.umask(0o077);
const config = configuration();
// Demo conversations need a stable encryption key across process restarts too.
if (config.mode === "demo") {
  const keyFile = `${config.database}.chat-key`;
  mkdirSync(dirname(keyFile), { recursive: true, mode: 0o700 });
  if (!existsSync(keyFile))
    writeFileSync(keyFile, randomBytes(32).toString("hex"), {
      flag: "wx",
      mode: 0o600,
    });
  config.vaultKey = readFileSync(keyFile, "utf8").trim();
}
const store = openStore(config.database, config.vaultKey, config.currency);
if (config.mode === "demo") store.seed(new Date().toISOString().slice(0, 7));
if (config.mode === "demo") seedGoalDemo(store, config.currency);
const server = createApp(config, store);
const goals = workspaceGoals(store, config.currency);
const goalTick = () => {
  try {
    goals.runDue();
  } catch {
    console.error(
      "Scheduled Goals check failed; allocations retained for retry.",
    );
  }
};
const goalTimer = setInterval(goalTick, 60_000);
goalTimer.unref();
goalTick();
server.requestTimeout = 60000;
server.headersTimeout = 10000;
server.listen(config.port, "127.0.0.1", () =>
  console.log(
    `BAS — Budget Automation Studio: ${config.origin} (${config.mode})`,
  ),
);
server.on("error", () => {
  console.error(
    "Server could not start. Check whether the configured port is available.",
  );
  store.close();
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    clearInterval(goalTimer);
    server.close(() => {
      store.close();
      process.exit(0);
    });
    server.closeIdleConnections();
  });
