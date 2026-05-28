import { z } from "zod";

import type { AgentTool } from "@/lib/agent/tools/types";

const inputSchema = z.object({
  prompt: z.string().trim().optional().default(""),
});

export const exportTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Export Planner",
  command: "export",
  description: "Builds a delivery checklist for exporting the project.",
  inputSchema,
  requiresApproval: true,
  sideEffect: "none",
  handler(ctx, input) {
    const brief = input.prompt.toLowerCase();
    const format = brief.includes("story") ? "Instagram Story" : ctx.project?.format || "reel";
    const resolution = brief.includes("16:9") || brief.includes("youtube") ? "1920x1080" : "1080x1920";

    return {
      message: "Export plan ready.",
      status: "awaiting_approval",
      output: {
        kind: "export_plan",
        summary: `Export ${ctx.project?.title ?? "this project"} as a polished ${format}.`,
        format,
        resolution,
        checklist: [
          "Confirm captions and on-screen text are inside safe margins.",
          "Check audio levels and remove dead air.",
          "Review the first three seconds for hook clarity.",
          "Export a high-quality review file before publishing.",
        ],
        deliveryNotes: input.prompt || "Use the platform-ready vertical export by default.",
      },
    };
  },
};
