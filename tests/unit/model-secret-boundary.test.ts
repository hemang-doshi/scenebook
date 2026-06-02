import { describe, expect, test } from "vitest";

import { assertServerOnlyModelSecrets, getGeminiApiKey, getNimApiKey } from "@/lib/ai/secrets";

describe("model secret boundary", () => {
  test("server-only helpers read Gemini and NIM API keys", () => {
    expect(getGeminiApiKey({ GEMINI_API_KEY: "gemini-key" })).toBe("gemini-key");
    expect(getGeminiApiKey({ GOOGLE_GENERATIVE_AI_API_KEY: "google-key" })).toBe("google-key");
    expect(getNimApiKey({ NIM_API_KEY: "nim-key" })).toBe("nim-key");
    expect(getNimApiKey({ NVIDIA_NIM_API_KEY: "nvidia-key" })).toBe("nvidia-key");
  });

  test("no NEXT_PUBLIC Gemini/NIM env names are introduced", () => {
    expect(() =>
      assertServerOnlyModelSecrets({
        NEXT_PUBLIC_GEMINI_API_KEY: "bad",
      }),
    ).toThrow(/server-only/i);
    expect(() =>
      assertServerOnlyModelSecrets({
        NEXT_PUBLIC_NIM_API_KEY: "bad",
      }),
    ).toThrow(/server-only/i);
  });
});
