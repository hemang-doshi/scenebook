import { z } from "zod";

import type { AgentTool } from "@/lib/agent/tools/types";
import { generateText } from "@/lib/ai/client";

const inputSchema = z.object({
  prompt: z.string().trim().min(1, "Provide a storyboard brief after /storyboard."),
});

function cleanJsonString(input: string): string {
  if (!input) return "";
  return input
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}

export const storyboardTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Storyboard Builder",
  command: "storyboard",
  description: "Turns a brief into a high-quality AI-generated storyboard.",
  inputSchema,
  requiresApproval: false,
  sideEffect: "none",
  async handler(ctx, input) {
    const subject = ctx.project?.title ?? "the scene";
    const format = ctx.project?.format ?? "short-form video";
    const platform = ctx.project?.platform ?? "social";

    const systemInstruction = "You are a master storyboard director, director of photography, and visual editor. You specialize in translating written concepts into rich, shot-by-shot cinematic blueprints.";
    const prompt = `Generate a highly detailed, cinematic shot-by-shot storyboard sequence (4-6 shots) for the project "${subject}".
Format: ${format}
Platform: ${platform}
Brief: ${input.prompt}

Apply these cinematic storyboard directives:
1. Specify camera angles and framing (e.g., Extreme Close Up [ECU], Medium Close Up [MCU], POV, low-angle tracking shot).
2. Detail camera movements (e.g., slow push-in, subtle whip pan, handheld dynamic slide).
3. Include lighting, color tone, and atmosphere descriptions (e.g., high-contrast rim lighting, moody cinematic shadows, anamorphic flares).
4. Outline precise audio cues, SFX, and narration directions for each shot.

You must return a valid JSON object matching the following structure (do not include markdown wrapping, just raw JSON):
{
  "title": "${subject}",
  "shots": [
    "Shot 1 [ECU - macro push-in]: [Visual: Description of action, lighting, and movement] | [Audio: Description of SFX, music shift, and voiceover]",
    "Shot 2 [POV - handheld tracking]: ...",
    "Shot 3...",
    "Shot 4..."
  ]
}`;

    let output = {
      title: subject,
      shots: [
        `Opening frame: establish ${subject} with ${input.prompt}.`,
        `Proof shot: capture the key detail that makes ${input.prompt} feel credible.`,
        `Motion beat: move closer or reframe to show the transition clearly.`,
        `Payoff shot: land the finished result with a clean end frame.`,
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
          title: parsed.title || output.title,
          shots: parsed.shots || output.shots,
        };
      }
    } catch (err) {
      console.warn("AI storyboard generation failed, falling back to structured template:", err);
    }

    return {
      message: `Storyboard ready for ${output.title}.`,
      output,
    };
  },
};
