import { describe, expect, test } from "vitest";

import { getProviderOrderForModel } from "@/lib/ai/client";

describe("AI client provider routing", () => {
  test("selected chat model uses its configured provider first", () => {
    expect(getProviderOrderForModel("nvidia/nemotron-3-super-120b-a12b").map((entry) => entry.provider)).toEqual([
      "nim",
      "gemini",
      "openrouter",
    ]);

    expect(getProviderOrderForModel("gemini-2.5-flash").map((entry) => entry.provider)).toEqual([
      "gemini",
      "openrouter",
      "nim",
    ]);

    expect(getProviderOrderForModel("google/gemini-2.5-flash").map((entry) => entry.provider)).toEqual([
      "openrouter",
      "gemini",
      "nim",
    ]);
  });
});
