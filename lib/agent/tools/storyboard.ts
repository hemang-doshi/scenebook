import { z } from "zod";

import type { AgentTool } from "@/lib/agent/tools/types";
import {
  generateStructuredCommandUpdate,
  withStructuredRepairMetadata,
} from "@/lib/agent/tools/structured-output";

const inputSchema = z.object({
  prompt: z.string().trim().min(1, "Provide a storyboard brief after /storyboard."),
});

export const storyboardTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Storyboard Builder",
  command: "storyboard",
  description: "Builds a structured shot list for the active project.",
  inputSchema,
  requiresApproval: true,
  sideEffect: "none",
  async handler(ctx, input) {
    const { output: parsed, repaired } = await generateStructuredCommandUpdate({
      ctx,
      command: "storyboard",
      prompt: [
        "Return only JSON.",
        `Schema:
{
  "summary": "string",
  "shots": [
    {
      "title": "string",
      "framing": "string",
      "camera_movement": "string",
      "lighting": "string",
      "audio": "string"
    }
  ]
}`,
        `User brief:\n${input.prompt}`,
      ].join("\n\n"),
      normalize: normalizeStoryboardOutput,
    });

    return {
      message: "Storyboard ready.",
      status: "awaiting_approval",
      output: withStructuredRepairMetadata({
        kind: "storyboard",
        summary: parsed.summary ?? "",
        shots: Array.isArray(parsed.shots) ? parsed.shots : [],
      }, repaired),
    };
  },
};

function normalizeStoryboardOutput(input: Record<string, unknown>) {
  return {
    summary: typeof input.summary === "string" ? input.summary : "",
    shots: normalizeShots(input.shots),
  };
}

function normalizeShots(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((shot): shot is Record<string, unknown> => typeof shot === "object" && shot !== null && !Array.isArray(shot))
    .map((shot) => ({
      title: typeof shot.title === "string" ? shot.title : "Shot",
      framing: typeof shot.framing === "string" ? shot.framing : "",
      camera_movement: typeof shot.camera_movement === "string" ? shot.camera_movement : "",
      lighting: typeof shot.lighting === "string" ? shot.lighting : "",
      audio: typeof shot.audio === "string" ? shot.audio : "",
    }));
}
