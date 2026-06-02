import { describe, expect, test } from "vitest";

import { createGoogleModel } from "@/lib/ai/model-gateway/providers/ai-sdk-google";
import { createNimModel } from "@/lib/ai/model-gateway/providers/ai-sdk-nim";
import { assertServerOnlyModelSecrets, getGeminiApiKey, getNimApiKey } from "@/lib/ai/secrets";

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

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

  test("Google/NIM model providers use server-only secret helper path", () => {
    const originalPublicGemini = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const originalPublicNim = process.env.NEXT_PUBLIC_NIM_API_KEY;
    const originalGemini = process.env.GEMINI_API_KEY;
    const originalNim = process.env.NIM_API_KEY;

    try {
      process.env.GEMINI_API_KEY = "gemini-key";
      process.env.NIM_API_KEY = "nim-key";
      process.env.NEXT_PUBLIC_GEMINI_API_KEY = "bad";
      expect(() => createGoogleModel("gemini-test")).toThrow(/server-only/i);

      delete process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      process.env.NEXT_PUBLIC_NIM_API_KEY = "bad";
      expect(() => createNimModel("nim-test")).toThrow(/server-only/i);
    } finally {
      restoreEnv("NEXT_PUBLIC_GEMINI_API_KEY", originalPublicGemini);
      restoreEnv("NEXT_PUBLIC_NIM_API_KEY", originalPublicNim);
      restoreEnv("GEMINI_API_KEY", originalGemini);
      restoreEnv("NIM_API_KEY", originalNim);
    }
  });
});
