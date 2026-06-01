import { describe, expect, test } from "vitest";
import { z } from "zod";

import {
  createRuntimeV4ModelGateway,
  generateAgentDecision,
  generateFinalResponse,
  generateIntentUnderstanding,
} from "@/lib/agent/runtime-v4/model";

describe("runtime-v4 model gateway", () => {
  test("can use the fake provider in tests", async () => {
    const gateway = createRuntimeV4ModelGateway({
      provider: "fake",
      fake: {
        textResponses: {
          final_response: "runtime v4 fake text",
        },
        structuredResponses: {
          test_fake: { decision: "final_response" },
        },
      },
    });

    await expect(
      gateway.generateText({
        profile: "final_response",
        prompt: "next step?",
      }),
    ).resolves.toMatchObject({ text: "runtime v4 fake text" });
    await expect(
      gateway.generateStructured({
        profile: "test_fake",
        prompt: "structured next step?",
        schema: z.object({
          decision: z.literal("final_response"),
        }),
      }),
    ).resolves.toMatchObject({
      object: { decision: "final_response" },
    });
  });

  test("intent helper uses structured_extraction profile", async () => {
    const gateway = createRuntimeV4ModelGateway({
      provider: "fake",
      fake: {
        structuredResponses: {
          structured_extraction: {
            intentType: "create_reel",
            confidence: 0.91,
            creativeMode: "plan",
            needsClarification: false,
            inferredGoal: "Make a reel about SceneBook",
          },
        },
      },
    });

    await expect(
      generateIntentUnderstanding({
        goal: "Help me make a reel about SceneBook",
        modelGateway: gateway,
      }),
    ).resolves.toMatchObject({
      object: {
        intentType: "create_reel",
        confidence: 0.91,
      },
    });
  });

  test("decision helper uses agent_decision profile", async () => {
    const gateway = createRuntimeV4ModelGateway({
      provider: "fake",
      fake: {
        structuredResponses: {
          agent_decision: {
            type: "final_response",
            response: "A clean decision.",
            confidence: 0.9,
          },
        },
      },
    });

    await expect(
      generateAgentDecision({
        prompt: "Pick the next step.",
        modelGateway: gateway,
      }),
    ).resolves.toMatchObject({
      object: {
        type: "final_response",
        response: "A clean decision.",
      },
    });
  });

  test("final response helper uses final_response profile", async () => {
    const gateway = createRuntimeV4ModelGateway({
      provider: "fake",
      fake: {
        textResponses: {
          final_response: "Here is the final answer.",
        },
      },
    });

    await expect(
      generateFinalResponse({
        prompt: "Synthesize the answer.",
        modelGateway: gateway,
      }),
    ).resolves.toMatchObject({
      text: "Here is the final answer.",
    });
  });
});
