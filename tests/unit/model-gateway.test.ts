import { describe, expect, test } from "vitest";
import { z } from "zod";

import { ModelGatewayConfigurationError } from "@/lib/ai/model-gateway";
import { createFakeModelGateway } from "@/lib/ai/model-gateway/providers/fake";
import { createGeminiModelGateway } from "@/lib/ai/model-gateway/providers/gemini";

describe("model gateway providers", () => {
  test("fake provider returns deterministic text", async () => {
    const gateway = createFakeModelGateway({
      text: "deterministic fake text",
    });

    await expect(gateway.generateText({ prompt: "Write a hook." })).resolves.toBe("deterministic fake text");
  });

  test("fake provider returns deterministic structured JSON", async () => {
    const gateway = createFakeModelGateway({
      structured: {
        status: "ok",
        title: "Deterministic",
      },
    });

    await expect(
      gateway.generateStructured({
        prompt: "Return project status.",
        schema: z.object({
          status: z.literal("ok"),
          title: z.string(),
        }),
      }),
    ).resolves.toEqual({
      status: "ok",
      title: "Deterministic",
    });
  });

  test("missing Gemini API key fails with a safe server-side configuration error", async () => {
    const gateway = createGeminiModelGateway({
      apiKey: "",
      model: "gemini-2.5-flash",
    });

    await expect(gateway.generateText({ prompt: "hello" })).rejects.toThrow(ModelGatewayConfigurationError);
    await expect(gateway.generateText({ prompt: "hello" })).rejects.toThrow(
      "Gemini model gateway is not configured. Set GEMINI_API_KEY on the server.",
    );
  });
});
