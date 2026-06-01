import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

import { ModelConfigurationError } from "@/lib/ai/model-gateway/errors";
import { defaultNimBaseUrl } from "@/lib/ai/model-gateway/model-profiles";

export function createNimModel(modelId: string): LanguageModel {
  const apiKey = process.env.NIM_API_KEY;

  if (!apiKey?.trim()) {
    throw new ModelConfigurationError({
      provider: "nim",
      message: "Missing NIM_API_KEY",
      recoverable: true,
    });
  }

  const nim = createOpenAICompatible({
    name: "nim",
    baseURL: process.env.NIM_BASE_URL ?? defaultNimBaseUrl,
    apiKey,
    supportsStructuredOutputs: true,
  });

  return nim(modelId);
}
