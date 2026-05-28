import { z } from "zod";

import type { AgentTool } from "@/lib/agent/tools/types";
import {
  generateStructuredCommandUpdate,
  withStructuredRepairMetadata,
} from "@/lib/agent/tools/structured-output";

const inputSchema = z.object({
  prompt: z.string().trim().min(1, "Provide a script brief after /script."),
});

export const scriptTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Script Builder",
  command: "script",
  description: "Builds a structured script package for the active project.",
  inputSchema,
  requiresApproval: true,
  sideEffect: "none",
  async handler(ctx, input) {
    const { output: parsed, repaired } = await generateStructuredCommandUpdate({
      ctx,
      command: "script",
      prompt: [
        "Return only JSON.",
        `Schema:
{
  "hook": "string",
  "outline": ["string"],
  "script": "string",
  "caption": "string",
  "cta": "string",
  "onScreenText": ["string"]
}`,
        `User brief:\n${input.prompt}`,
      ].join("\n\n"),
      normalize: normalizeScriptOutput,
    });

    return {
      message: "Script package ready.",
      status: "awaiting_approval",
      output: withStructuredRepairMetadata({
        kind: "script_package",
        hook: parsed.hook ?? "",
        outline: Array.isArray(parsed.outline) ? parsed.outline : [],
        script: parsed.script ?? "",
        caption: parsed.caption ?? "",
        cta: parsed.cta ?? "",
        onScreenText: Array.isArray(parsed.onScreenText) ? parsed.onScreenText : [],
      }, repaired),
    };
  },
};

function normalizeScriptOutput(input: unknown) {
  const source: Record<string, unknown> =
    isRecord(input) && isRecord(input.scriptLab)
      ? input.scriptLab
      : isRecord(input)
        ? input
        : {};

  return {
    hook: typeof source?.hook === "string" ? source.hook : undefined,
    outline: normalizeStringList(source?.outline),
    script: typeof source?.script === "string" ? source.script : undefined,
    caption: typeof source?.caption === "string" ? source.caption : undefined,
    cta: typeof source?.cta === "string" ? source.cta : undefined,
    onScreenText: normalizeStringList(source?.onScreenText),
  };
}

function normalizeStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\n+/)
      .map((item) => item.replace(/^[-*\d.\s]+/, "").trim())
      .filter(Boolean);
  }

  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
