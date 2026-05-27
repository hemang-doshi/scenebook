import { z } from "zod";

import type { AgentTool } from "@/lib/agent/tools/types";

const inputSchema = z.object({
  prompt: z.string().trim().optional().default(""),
});

function buildItems(prefix: string, title: string, detail?: string) {
  return [
    `${prefix} lock the goal for ${title}`,
    detail ? `${prefix} cover ${detail}` : `${prefix} cover the key proof shot`,
  ];
}

export const tasksTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Production Tasks",
  command: "tasks",
  description: "Builds a deterministic production checklist for the active project.",
  inputSchema,
  requiresApproval: false,
  sideEffect: "none",
  handler(ctx, input) {
    const project = ctx.project;
    const title = project?.title ?? "the active project";
    const detail = input.prompt || project?.scriptLab.angle || project?.scriptLab.hook;
    const output = {
      preProduction: buildItems("Pre-pro", title, detail),
      shoot: buildItems("Shoot", title, detail),
      edit: buildItems("Edit", title, detail),
      publish: buildItems("Publish", title, detail),
    };

    return {
      message: `Production checklist ready for ${title}.`,
      output,
    };
  },
};
