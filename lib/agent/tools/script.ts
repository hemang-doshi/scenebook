import { z } from "zod";

import type { AgentTool } from "@/lib/agent/tools/types";

const inputSchema = z.object({
  prompt: z.string().trim().min(1, "Provide a script brief after /script."),
});

function pickHook(subject: string, prompt: string, existingHook?: string) {
  if (existingHook?.trim()) {
    return existingHook.trim();
  }

  return `Stop scrolling: ${subject} turned into a stronger scene with ${prompt}.`;
}

export const scriptTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Script Builder",
  command: "script",
  description: "Creates a deterministic script package for the active project.",
  inputSchema,
  requiresApproval: false,
  sideEffect: "db_write",
  handler(ctx, input) {
    const project = ctx.project;
    const subject = project?.title ?? "this concept";
    const format = project?.format ?? "short-form video";
    const platform = project?.platform ?? "social";
    const hook = pickHook(subject, input.prompt, project?.scriptLab.hook);
    const outline = [
      `1. Open on the core promise: ${hook}`,
      `2. Show the setup or problem in one fast beat tied to ${subject}.`,
      `3. Deliver the practical change: ${input.prompt}.`,
      `4. Land the payoff and point back to the viewer's next move.`,
    ];
    const script = [
      `${hook}`,
      `Here's the setup: ${subject} is the focus, and the frame should immediately show why it matters.`,
      `Then move straight into ${input.prompt} with one concrete example or visual proof.`,
      `Close by showing the result and inviting the viewer to copy the workflow.`,
    ].join("\n\n");
    const caption = `${subject} for ${platform}, tightened around ${input.prompt}. Save this before your next ${format}.`;
    const cta = `Save this and use it on your next ${format}.`;
    const onScreenText = [subject, input.prompt, cta].join(" | ");

    const output = {
      hook,
      outline,
      script,
      caption,
      cta,
      onScreenText,
    };

    return {
      message: [
        `Hook: ${hook}`,
        "",
        "Outline:",
        ...outline.map((step) => `- ${step}`),
        "",
        "Script:",
        script,
        "",
        `Caption: ${caption}`,
        `CTA: ${cta}`,
        `On-screen text: ${onScreenText}`,
      ].join("\n"),
      output,
      saveAsAssistantMessage: true,
    };
  },
};
