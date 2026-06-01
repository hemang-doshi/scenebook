import { describe, expect, test } from "vitest";
import { z } from "zod";

import { createRuntimeV4ModelGateway } from "@/lib/agent/runtime-v4/model";

describe("runtime-v4 model gateway", () => {
  test("can use the fake provider in tests", async () => {
    const gateway = createRuntimeV4ModelGateway({
      provider: "fake",
      fake: {
        text: "runtime v4 fake text",
        structured: { decision: "final_response" },
      },
    });

    await expect(gateway.generateText({ prompt: "next step?" })).resolves.toBe("runtime v4 fake text");
    await expect(
      gateway.generateStructured({
        prompt: "structured next step?",
        schema: z.object({
          decision: z.literal("final_response"),
        }),
      }),
    ).resolves.toEqual({ decision: "final_response" });
  });
});
