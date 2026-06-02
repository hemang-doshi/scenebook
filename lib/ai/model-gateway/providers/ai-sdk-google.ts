import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

import { ModelConfigurationError } from "@/lib/ai/model-gateway/errors";
import { getGeminiApiKey } from "@/lib/ai/secrets";

export function createGoogleModel(modelId: string): LanguageModel {
  const apiKey = getGeminiApiKey();

  if (!apiKey?.trim()) {
    throw new ModelConfigurationError({
      provider: "google",
      message: "Missing GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY",
      recoverable: true,
    });
  }

  const google = createGoogleGenerativeAI({ apiKey });
  return google(modelId);
}
