import { z } from "zod";

import type { AgentTool } from "@/lib/agent/tools/types";
import {
  generateStructuredCommandUpdate,
  withStructuredRepairMetadata,
} from "@/lib/agent/tools/structured-output";

const inputSchema = z.object({
  prompt: z.string().trim().optional().default(""),
});

export const instagramTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Instagram Planner",
  command: "instagram",
  description: "Builds a structured Instagram execution plan for the active project.",
  inputSchema,
  requiresApproval: true,
  sideEffect: "none",
  async handler(ctx, input) {
    const { output: parsed, repaired } = await generateStructuredCommandUpdate({
      ctx,
      command: "instagram",
      prompt: [
        "Return only JSON.",
        `Schema:
{
  "summary": "string",
  "caption": "string",
  "hashtags": ["string"],
  "checklist": ["string"]
}`,
        `User request:\n${input.prompt || "Prepare an Instagram publish plan for this project."}`,
      ].join("\n\n"),
      normalize: normalizeInstagramOutput,
    });

    return {
      message: "Instagram plan ready.",
      status: "awaiting_approval",
      output: withStructuredRepairMetadata({
        kind: "instagram_plan",
        summary: parsed.summary ?? "",
        caption: parsed.caption ?? "",
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
        checklist: Array.isArray(parsed.checklist) ? parsed.checklist : [],
      }, repaired),
    };
  },
};

function normalizeInstagramOutput(input: Record<string, unknown>) {
  return {
    summary: typeof input.summary === "string" ? input.summary : "",
    caption: typeof input.caption === "string" ? input.caption : "",
    hashtags: normalizeStringList(input.hashtags),
    checklist: normalizeStringList(input.checklist),
  };
}

function normalizeStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
