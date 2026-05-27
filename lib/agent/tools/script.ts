import { z } from "zod";

import type { AgentTool } from "@/lib/agent/tools/types";
import { generateText } from "@/lib/ai/client";

const inputSchema = z.object({
  prompt: z.string().trim().min(1, "Provide a script brief after /script."),
});

function cleanJsonString(input: string): string {
  if (!input) return "";
  return input
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}

export const scriptTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Script Builder",
  command: "script",
  description: "Creates a script package using specialized AI generation.",
  inputSchema,
  requiresApproval: false,
  sideEffect: "db_write",
  async handler(ctx, input) {
    const project = ctx.project;
    const subject = project?.title ?? "this concept";
    const format = project?.format ?? "short-form video";
    const platform = project?.platform ?? "social";

    const systemInstruction = "You are a world-class creator consultant, scriptwriter, and viral media strategist. You write highly engaging video scripts, hooks, and social copy tailored to keep viewers watching.";
    const prompt = `You are tasked with generating a high-converting, professional content script package for a project named "${subject}".
Format: ${format}
Platform: ${platform}
Brief/Concept: ${input.prompt}
Outline/Angle: ${project?.scriptLab.angle || "Tactile luxury feel"}

Apply these expert scriptwriting rules:
1. Hook: Write a high-retention hook using a curiosity gap, negative priming (e.g., "Stop doing X..."), or a high-contrast visual setup. It must hook the viewer in under 2 seconds.
2. Outline: Structure a clear 4-step narrative flow (Hook, setups/problems, payoff/delivery, and call to action).
3. Script: Write a highly engaging voiceover accompanied by precise visual notes (e.g., [Visual: Close up of watch face under direct light], [Audio: ticking SFX]).
4. Caption: Write a persuasive social media caption with a strong hook, clear bullet points, and high curiosity.
5. CTA: Include a clear call-to-action that encourages saving, sharing, or commenting.
6. On-screen text: Short, punchy text overlays for high retention.

You must return a valid JSON object matching the following structure (do not include markdown wrapping or backticks, just raw JSON):
{
  "hook": "A highly engaging hook for the video",
  "outline": ["Step 1...", "Step 2...", "Step 3...", "Step 4..."],
  "script": "Voiceover: [narration]\\n[Visual: description]",
  "caption": "A compelling social media caption",
  "cta": "A clear Call-To-Action",
  "onScreenText": "Short key text elements to overlay on screen"
}`;

    let output = {
      hook: `Stop scrolling: ${subject} turned into a stronger scene with ${input.prompt}.`,
      outline: [
        `1. Open on the core promise`,
        `2. Show the setup or problem tied to ${subject}.`,
        `3. Deliver the practical change: ${input.prompt}.`,
        `4. Land the payoff.`,
      ],
      script: `Voiceover: Fix your ${subject} content setup by focusing on ${input.prompt}. Here is exactly how to do it.`,
      caption: `${subject} for ${platform}, tightened around ${input.prompt}.`,
      cta: `Save this and use it on your next ${format}.`,
      onScreenText: `${subject} | ${input.prompt}`,
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
          hook: parsed.hook || output.hook,
          outline: parsed.outline || output.outline,
          script: parsed.script || output.script,
          caption: parsed.caption || output.caption,
          cta: parsed.cta || output.cta,
          onScreenText: parsed.onScreenText || output.onScreenText,
        };
      }
    } catch (err) {
      console.warn("AI script generation failed, falling back to structured template:", err);
    }

    return {
      message: [
        `Hook: ${output.hook}`,
        "",
        "Outline:",
        ...output.outline.map((step) => `- ${step}`),
        "",
        "Script:",
        output.script,
        "",
        `Caption: ${output.caption}`,
        `CTA: ${output.cta}`,
        `On-screen text: ${output.onScreenText}`,
      ].join("\n"),
      output,
      saveAsAssistantMessage: true,
    };
  },
};
