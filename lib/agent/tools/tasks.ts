import { z } from "zod";

import { getLatestProjectMemory } from "@/lib/agent/memory";
import type { AgentTool } from "@/lib/agent/tools/types";
import {
  generateStructuredCommandUpdate,
  withStructuredRepairMetadata,
} from "@/lib/agent/tools/structured-output";

const inputSchema = z.object({
  prompt: z.string().trim().optional().default(""),
});

export const tasksTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Production Tasks",
  command: "tasks",
  description: "Builds an updated structured production task plan.",
  inputSchema,
  requiresApproval: true,
  sideEffect: "none",
  async handler(ctx, input) {
    const latestMemory = await getLatestProjectMemory(ctx.projectId).catch(() => null);
    const { output: parsed, repaired } = await generateStructuredCommandUpdate({
      ctx,
      command: "tasks",
      prompt: [
        "Return only JSON.",
        `Schema:
{
  "summary": "string",
  "tasks": {
    "preProduction": ["string"],
    "shoot": ["string"],
    "edit": ["string"],
    "publish": ["string"]
  },
  "ideas": ["string"]
}`,
        latestMemory?.metadata
          ? `Existing task memory:\n${JSON.stringify(latestMemory.metadata)}`
          : "Existing task memory: none",
        `User request:\n${input.prompt || "Refresh the current production plan."}`,
      ].join("\n\n"),
      normalize: normalizeTasksOutput,
    });

    const tasks = {
      preProduction: Array.isArray(parsed.tasks?.preProduction) ? parsed.tasks?.preProduction : [],
      shoot: Array.isArray(parsed.tasks?.shoot) ? parsed.tasks?.shoot : [],
      edit: Array.isArray(parsed.tasks?.edit) ? parsed.tasks?.edit : [],
      publish: Array.isArray(parsed.tasks?.publish) ? parsed.tasks?.publish : [],
    };
    const ideas = Array.isArray(parsed.ideas) ? parsed.ideas : [];

    return {
      message: "Task plan updated.",
      status: "awaiting_approval",
      output: withStructuredRepairMetadata({
        kind: "task_plan",
        summary: parsed.summary ?? "",
        tasks,
        ideas,
      }, repaired),
    };
  },
};

function normalizeTasksOutput(input: Record<string, unknown>) {
  return {
    summary: typeof input.summary === "string" ? input.summary : "",
    tasks: typeof input.tasks === "object" && input.tasks !== null && !Array.isArray(input.tasks)
      ? input.tasks as Record<string, string[]>
      : {},
    ideas: Array.isArray(input.ideas) ? input.ideas.filter((item): item is string => typeof item === "string") : [],
  };
}
