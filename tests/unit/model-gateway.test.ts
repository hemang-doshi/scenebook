import { afterEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";

import { resolveModelProfile } from "@/lib/ai/model-gateway";
import {
  ModelConfigurationError,
} from "@/lib/ai/model-gateway/errors";
import { createGoogleModel } from "@/lib/ai/model-gateway/providers/ai-sdk-google";
import { createNimModel } from "@/lib/ai/model-gateway/providers/ai-sdk-nim";
import { createFakeModelGateway } from "@/lib/ai/model-gateway/providers/fake";

describe("model gateway providers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("fake provider returns deterministic text", async () => {
    const gateway = createFakeModelGateway({
      textResponses: {
        final_response: "deterministic fake text",
      },
    });

    await expect(
      gateway.generateText({
        profile: "final_response",
        prompt: "Write a hook.",
      }),
    ).resolves.toMatchObject({
      text: "deterministic fake text",
      finishReason: "stop",
    });
  });

  test("fake provider validates deterministic structured output", async () => {
    const gateway = createFakeModelGateway({
      structuredResponses: {
        agent_decision: {
          type: "final_response",
          response: "Deterministic",
          confidence: 0.82,
        },
      },
    });

    await expect(
      gateway.generateStructured({
        profile: "agent_decision",
        prompt: "Return project status.",
        schema: z.object({
          type: z.literal("final_response"),
          response: z.string(),
          confidence: z.number(),
        }),
      }),
    ).resolves.toMatchObject({
      object: {
        type: "final_response",
        response: "Deterministic",
        confidence: 0.82,
      },
    });
  });

  test("fake provider streams deterministic chunks", async () => {
    const gateway = createFakeModelGateway({
      streamChunks: {
        final_response: ["one ", "two"],
      },
    });

    const result = await gateway.streamText({
      profile: "final_response",
      prompt: "stream please",
    });
    const chunks: string[] = [];

    for await (const chunk of result.textStream) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["one ", "two"]);
  });

  test("fake provider can simulate malformed structured output", async () => {
    const gateway = createFakeModelGateway({
      malformedStructuredProfiles: ["agent_decision"],
    });

    await expect(
      gateway.generateStructured({
        profile: "agent_decision",
        prompt: "Return a decision.",
        schema: z.object({
          type: z.literal("final_response"),
          response: z.string(),
          confidence: z.number(),
        }),
      }),
    ).rejects.toMatchObject({
      code: "MODEL_STRUCTURED_OUTPUT_ERROR",
      rawText: "not json",
      recoverable: true,
    });
  });

  test("missing Google Gemini key throws a recoverable configuration error", () => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");

    expect(() => createGoogleModel("gemini-2.5-flash")).toThrow(ModelConfigurationError);
    expect(() => createGoogleModel("gemini-2.5-flash")).toThrow(
      "Missing GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY",
    );
  });

  test("missing NIM key throws a recoverable configuration error", () => {
    vi.stubEnv("NIM_API_KEY", "");

    try {
      createNimModel("meta/llama-3.1-70b-instruct");
      throw new Error("Expected createNimModel to throw");
    } catch (caught) {
      expect(caught).toBeInstanceOf(ModelConfigurationError);
      expect(caught).toMatchObject({
        code: "MODEL_CONFIGURATION_ERROR",
        provider: "nim",
        recoverable: true,
      });
    }
  });

  test("profile resolver selects fake provider in test mode", () => {
    vi.stubEnv("AGENT_MODEL_PROFILE", "test_fake");

    expect(resolveModelProfile({ profile: "agent_decision" })).toMatchObject({
      profile: "test_fake",
      provider: "fake",
      model: "fake-model",
    });
  });
});
