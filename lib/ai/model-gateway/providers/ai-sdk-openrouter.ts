import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

import { ModelConfigurationError } from "@/lib/ai/model-gateway/errors";
import { getOpenRouterApiKey } from "@/lib/ai/secrets";

const defaultOpenRouterBaseUrl = "https://openrouter.ai/api/v1";

export function createOpenRouterModel(modelId: string): LanguageModel {
  const apiKey = getOpenRouterApiKey();

  if (!apiKey?.trim()) {
    throw new ModelConfigurationError({
      provider: "openrouter",
      message: "Missing OPENROUTER_API_KEY",
      recoverable: true,
    });
  }

  const openrouter = createOpenAICompatible({
    name: "openrouter",
    baseURL: process.env.OPENROUTER_BASE_URL ?? defaultOpenRouterBaseUrl,
    apiKey,
    supportsStructuredOutputs: true,
  });

  return openrouter(modelId);
}
