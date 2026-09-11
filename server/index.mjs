import { configuration } from "./config.mjs";
import { openStore } from "./store.mjs";
import { createApp } from "./app.mjs";
process.umask(0o077);
const config = configuration();
const store = openStore(config.database, config.vaultKey, config.currency);
if (config.mode === "demo") store.seed(new Date().toISOString().slice(0, 7));
const server = createApp(config, store);
server.requestTimeout = 60000;
server.headersTimeout = 10000;
server.listen(config.port, "127.0.0.1", () =>
  console.log(`Budget Automation Starter: ${config.origin} (${config.mode})`),
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
    server.close(() => {
      store.close();
      process.exit(0);
    });
    server.closeIdleConnections();
  });
