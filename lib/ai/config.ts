export type ProviderName = "roboflow" | "gemini";

export type ProviderConfiguration =
  | { provider: "roboflow"; modelId: string; apiKey: string }
  | { provider: "gemini"; modelId: string; apiKey: string };

export const defaultGeminiModel = "gemini-3.8-flash";

export function getDefaultProvider(): ProviderName {
  return process.env.AI_PROVIDER === "gemini" ? "gemini" : "roboflow";
}

export function getProviderConfiguration(provider: ProviderName = getDefaultProvider()): ProviderConfiguration | null {
  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return null;
    return { provider: "gemini", modelId: defaultGeminiModel, apiKey };
  }

  const apiKey = process.env.ROBOFLOW_API_KEY?.trim();
  const modelId = process.env.ROBOFLOW_MODEL_ID?.trim();
  if (!apiKey || !modelId || !/^[\w.-]+\/[\w.-]+(?:\/[\w.-]+)?$/.test(modelId)) return null;
  return { provider: "roboflow", modelId, apiKey };
}

export function getProviderAvailability() {
  return {
    roboflow: getProviderConfiguration("roboflow") !== null,
    gemini: getProviderConfiguration("gemini") !== null,
  };
}

export function isProviderConfigured(provider: ProviderName = getDefaultProvider()) {
  return getProviderConfiguration(provider) !== null;
}