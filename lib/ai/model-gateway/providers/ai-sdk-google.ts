import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

import { ModelConfigurationError } from "@/lib/ai/model-gateway/errors";

export function createGoogleModel(modelId: string): LanguageModel {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;

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
