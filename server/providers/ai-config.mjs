export const AI_PROVIDERS = Object.freeze({
  disabled: { label: "Budget summaries", model: "", cloud: false },
  openai: {
    label: "OpenAI",
    model: "gpt-4.1-mini",
    cloud: true,
    key: "OPENAI_API_KEY",
  },
  anthropic: {
    label: "Anthropic",
    model: "claude-haiku-4-5",
    cloud: true,
    key: "ANTHROPIC_API_KEY",
  },
  gemini: {
    label: "Google Gemini",
    model: "gemini-3.8-flash",
    cloud: true,
    key: "GEMINI_API_KEY",
  },
  ollama: { label: "Local Ollama", model: "", cloud: false },
});

export function aiConfiguration(env, mode) {
  const selected = env.AI_PROVIDER || "disabled";
  if (!Object.hasOwn(AI_PROVIDERS, selected))
    throw new Error(
      "AI_PROVIDER must be disabled, openai, anthropic, gemini or ollama",
    );
  const provider = mode === "demo" ? "disabled" : selected;
  const definition = AI_PROVIDERS[provider];
  const model =
    provider === "disabled"
      ? ""
      : env.AI_MODEL ||
        (provider === "ollama" ? env.OLLAMA_MODEL : "") ||
        definition.model;
  if (model && !/^[a-zA-Z0-9_.:/-]{1,120}$/.test(model))
    throw new Error("AI_MODEL must be a provider model identifier");
  if (provider === "ollama" && /cloud/i.test(model))
    throw new Error("Choose a locally downloaded Ollama model");
  const apiKey = definition.cloud
    ? (env.AI_API_KEY || env[definition.key] || "").trim()
    : "";
  if (apiKey && !/^[\x21-\x7e]{1,2048}$/.test(apiKey))
    throw new Error(
      "AI API key must contain printable characters without whitespace",
    );
  return {
    provider,
    label: definition.label,
    model,
    cloud: definition.cloud,
    configured:
      provider !== "disabled" && !!model && (!definition.cloud || !!apiKey),
    apiKey,
  };
}

// Explicit allowlist: never serialize the settings object containing the API key.
export function aiStatus(config) {
  const { provider, label, model, cloud, configured } = config.assistant;
  return { provider, label, model, cloud, configured };
}
