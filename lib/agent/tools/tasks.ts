import { z } from "zod";

import type { AgentTool } from "@/lib/agent/tools/types";
import { generateText } from "@/lib/ai/client";

const inputSchema = z.object({
  prompt: z.string().trim().optional().default(""),
});

function cleanJsonString(input: string): string {
  if (!input) return "";
  return input
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}

export const tasksTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Production Tasks",
  command: "tasks",
  description: "Builds a production checklist for the active project.",
  inputSchema,
  requiresApproval: false,
  sideEffect: "none",
  async handler(ctx, input) {
    const project = ctx.project;
    const title = project?.title ?? "the active project";
    const detail = input.prompt || project?.scriptLab.angle || project?.scriptLab.hook || "";

    const systemInstruction = "You are a senior production manager, video producer, and operations strategist. You break down creative video concepts into detailed, action-oriented checklists across all stages of production.";
    const prompt = `Create a comprehensive, professional production task checklist for the project "${title}".
Format: ${project?.format || "short-form video"}
Detail/Brief: ${detail}

Provide highly specific tasks for each category:
1. preProduction: Focus on asset cataloging, script locking, mock layouts, props, storyboards, and equipment testing.
2. shoot: Focus on lighting staging, framing check, audio testing, B-roll sequencing, and capturing multi-angle setups.
3. edit: Focus on sound effects design, subtitle timing, transitions, visual effects, and color grading for high-contrast dark workspaces.
4. publish: Focus on cover thumbnail framing, caption optimization, tag strategy, and scheduling parameters.

You must return a valid JSON object matching the following structure (do not include markdown wrapping, just raw JSON):
{
  "preProduction": ["Pre-pro: [action item]", "Pre-pro: [action item]"],
  "shoot": ["Shoot: [action item]", "Shoot: [action item]"],
  "edit": ["Edit: [action item]", "Edit: [action item]"],
  "publish": ["Publish: [action item]", "Publish: [action item]"]
}`;

    let output = {
      preProduction: [
        `Pre-pro lock the goal for ${title}`,
        detail ? `Pre-pro cover ${detail}` : `Pre-pro cover the key proof shot`,
      ],
      shoot: [
        `Shoot lock the goal for ${title}`,
        detail ? `Shoot cover ${detail}` : `Shoot cover the key proof shot`,
      ],
      edit: [
        `Edit lock the goal for ${title}`,
        detail ? `Edit cover ${detail}` : `Edit cover the key proof shot`,
      ],
      publish: [
        `Publish lock the goal for ${title}`,
        detail ? `Publish cover ${detail}` : `Publish cover the key proof shot`,
      ],
    };

    try {
      const response = await generateText({
        prompt,
        systemInstruction,
        modelOverride: ctx.selectedModel || undefined,
      });

      const parsed = JSON.parse(cleanJsonString(response));
      if (parsed && typeof parsed === "object") {
        output = {
          preProduction: parsed.preProduction || output.preProduction,
          shoot: parsed.shoot || output.shoot,
          edit: parsed.edit || output.edit,
          publish: parsed.publish || output.publish,
        };
      }
    } catch (err) {
      console.warn("AI task generation failed, falling back to structured template:", err);
    }

    return {
      message: `Production checklist ready for ${title}.`,
      output,
    };
  },
};
