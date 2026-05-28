import { z } from "zod";

import type { AgentTool } from "@/lib/agent/tools/types";

const inputSchema = z.object({
  prompt: z.string().trim().optional().default(""),
});

export const importToEditorTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Editor Handoff",
  command: "import-to-editor",
  description: "Prepares the current project for editor handoff.",
  inputSchema,
  requiresApproval: true,
  sideEffect: "none",
  handler(ctx, input) {
    const title = ctx.project?.title ?? "this project";
    const brief = input.prompt || "Prepare the current project for editing.";

    return {
      message: "Editor handoff ready.",
      status: "awaiting_approval",
      output: {
        kind: "editor_handoff",
        summary: `Prepare ${title} in the editor using the current script, generated assets, and this request: ${brief}`,
        editorHref: `/editor/${ctx.projectId}`,
        recommendedAssets: ctx.project?.assets.slice(0, 6).map((asset) => asset.url || asset.id).filter(Boolean) ?? [],
        nextSteps: [
          "Open the editor timeline.",
          "Place the strongest generated asset first.",
          "Add script beats as timeline markers.",
          "Export a rough cut for review.",
        ],
      },
    };
  },
};
