import { z } from "zod";

import type { AgentTool } from "@/lib/agent/tools/types";

const inputSchema = z.object({
  prompt: z.string().trim().min(1, "Provide a rough idea after /form-json-prompt."),
});

function isTooVague(prompt: string) {
  const words = prompt
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  return words.length < 4 || prompt.length < 24;
}

function buildCamera(projectFormat?: string) {
  if (projectFormat === "carousel" || projectFormat === "post") {
    return "static framing with deliberate composition";
  }

  return "handheld push-in with one clean close-up";
}

export const formJsonPromptTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Form JSON Prompt",
  command: "form-json-prompt",
  description: "Turns a rough idea into a structured cinematic JSON prompt.",
  inputSchema,
  requiresApproval: true,
  sideEffect: "none",
  handler(ctx, input) {
    if (isTooVague(input.prompt)) {
      const clarifyingQuestions = [
        "What is the exact subject or product on screen?",
        "What mood should the scene convey?",
        "What final output are you trying to generate: still, video, or sequence?",
      ];

      return {
        message: "The idea is too vague to turn into a reliable JSON prompt yet.",
        output: {
          clarifyingQuestions,
        },
      };
    }

    const project = ctx.project;
    const subject = project?.title ?? input.prompt.split(/[,.]/)[0] ?? input.prompt;
    const jsonPrompt = {
      intent: input.prompt,
      subject,
      visual_style: project?.platform === "instagram" ? "cinematic creator reel" : "cinematic editorial",
      camera: buildCamera(project?.format),
      lighting: "soft key light with a practical highlight and controlled contrast",
      scene: project?.scriptLab.angle?.trim() || `A polished scene centered on ${subject}.`,
      motion: project?.format === "post" ? "minimal motion with subtle ambient movement" : "controlled subject motion with clear beginning and payoff",
      negative_prompt: "muddy lighting, weak focal subject, cluttered frame, unreadable text, extra limbs, warped faces",
      output: {
        format: project?.format ?? "short",
        platform: project?.platform ?? "instagram",
        aspect_ratio: project?.platform === "youtube" ? "16:9" : "9:16",
      },
    };

    return {
      message: "Structured JSON prompt ready for approval.",
      output: jsonPrompt,
    };
  },
};
