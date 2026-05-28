import { z } from "zod";

import type { AgentTool } from "@/lib/agent/tools/types";
import {
  generateStructuredCommandUpdate,
  withStructuredRepairMetadata,
} from "@/lib/agent/tools/structured-output";

const inputSchema = z.object({
  prompt: z.string().trim().optional().default(""),
});

export const analyzeTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Content Analyzer",
  command: "analyze",
  description: "Builds a structured analysis and follow-up strategy for the active project.",
  inputSchema,
  requiresApproval: true,
  sideEffect: "none",
  async handler(ctx, input) {
    const { output: parsed, repaired } = await generateStructuredCommandUpdate({
      ctx,
      command: "analyze",
      prompt: [
        "Return only JSON.",
        `Schema:
{
  "summary": "string",
  "strengths": ["string"],
  "risks": ["string"],
  "next_steps": ["string"]
}`,
        `User request:\n${input.prompt || "Analyze the current project performance and suggest next steps."}`,
      ].join("\n\n"),
      normalize: normalizeAnalysisOutput,
    });

    return {
      message: "Analysis ready.",
      status: "awaiting_approval",
      output: withStructuredRepairMetadata({
        kind: "analysis",
        summary: parsed.summary ?? "",
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        risks: Array.isArray(parsed.risks) ? parsed.risks : [],
        next_steps: Array.isArray(parsed.next_steps) ? parsed.next_steps : [],
      }, repaired),
    };
  },
};

function normalizeAnalysisOutput(input: Record<string, unknown>) {
  return {
    summary: typeof input.summary === "string" ? input.summary : "",
    strengths: normalizeStringList(input.strengths),
    risks: normalizeStringList(input.risks),
    next_steps: normalizeStringList(input.next_steps),
  };
}

function normalizeStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
