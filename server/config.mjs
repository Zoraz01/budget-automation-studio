import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
export function configuration(env = process.env) {
  const mode = env.APP_MODE || "demo";
  if (!["demo", "personal"].includes(mode))
    throw new Error("APP_MODE must be demo or personal");
  const port = Number(env.PORT || 4310);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("PORT must be 1024–65535");
  const currency = env.BUDGET_CURRENCY || "USD";
  if (
    !["USD", "CAD", "EUR", "GBP", "AUD", "NZD", "CHF", "SGD", "HKD"].includes(
      currency,
    )
  )
    throw new Error("Choose a supported two-decimal currency");
  const password = mode === "demo" ? "demo" : env.APP_PASSWORD;
  const vaultKey =
    mode === "demo" ? randomBytes(32).toString("hex") : env.VAULT_KEY;
  if (!password || password.length < (mode === "demo" ? 4 : 24))
    throw new Error("Run npm run setup to create personal credentials");
  if (!/^[a-f0-9]{64}$/.test(vaultKey || ""))
    throw new Error("VAULT_KEY must contain 64 lowercase hex characters");
  const plaidEnv = env.PLAID_ENV || "sandbox";
  if (!["sandbox", "production"].includes(plaidEnv))
    throw new Error("PLAID_ENV must be sandbox or production");
  if (
    mode === "personal" &&
    plaidEnv === "production" &&
    env.ALLOW_LIVE_PLAID !== "true"
  )
    throw new Error("Production Plaid requires ALLOW_LIVE_PLAID=true");
  const aiProvider = env.AI_PROVIDER || "disabled";
  if (!["disabled", "ollama"].includes(aiProvider))
    throw new Error("AI_PROVIDER must be disabled or ollama");
  const snapMode = env.SNAPTRADE_AUTH_MODE || "personal";
  if (!["personal", "commercial"].includes(snapMode))
    throw new Error("Invalid SNAPTRADE_AUTH_MODE");
  return {
    mode,
    port,
    currency,
    password,
    vaultKey,
    origin: `http://127.0.0.1:${port}`,
    database: resolve("data", `${mode}.sqlite`),
    plaidEnv,
    plaid: mode === "personal" && !!(env.PLAID_CLIENT_ID && env.PLAID_SECRET),
    snaptrade:
      mode === "personal" &&
      !!(env.SNAPTRADE_CLIENT_ID && env.SNAPTRADE_CONSUMER_KEY),
    ai: mode === "personal" && aiProvider === "ollama" && !!env.OLLAMA_MODEL,
    snapMode,
    env,
  };
}
