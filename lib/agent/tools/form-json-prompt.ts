import { z } from "zod";

import type { PromptJsonOutput } from "@/lib/agent/types";
import type { AgentTool, AgentToolResult } from "@/lib/agent/tools/types";
import {
  generateStructuredCommandUpdate,
  normalizePromptJsonOutput,
  withStructuredRepairMetadata,
} from "@/lib/agent/tools/structured-output";

const inputSchema = z.object({
  prompt: z.string().trim().min(1, "Provide a rough idea after /form-json-prompt."),
});

function isVaguePrompt(prompt: string) {
  const words = prompt
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  return words.length < 6 || prompt.length < 36;
}

function buildClarifyingQuestions(prompt: string) {
  return [
    `How old or what type of subject should appear in "${prompt}"?`,
    "What should they be wearing or how should they look?",
    "What exact action or moment should the scene capture?",
  ];
}

export const formJsonPromptTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Form JSON Prompt",
  command: "form-json-prompt",
  description: "Builds a copy-ready JSON prompt for image, video, or audio generation.",
  inputSchema,
  requiresApproval: true,
  sideEffect: "none",
  async handler(ctx, input) {
    const prompt = input.prompt.trim();

    if (isVaguePrompt(prompt) && !prompt.includes("\n")) {
      const questions = buildClarifyingQuestions(prompt);
      return {
        message: "I need a bit more visual detail before I can build a reliable prompt JSON.",
        status: "awaiting_input",
        output: {
          kind: "prompt_questions",
          status: "awaiting_input",
          original_prompt: prompt,
          questions,
        },
      };
    }

    const { output: parsed, repaired } = await generateStructuredCommandUpdate({
      ctx,
      command: "form-json-prompt",
      prompt: [
        "Turn the user's visual request into a strict JSON object.",
        "Treat the user's request as primary. Do not continue the project script or beat unless the user explicitly asked for that.",
        "Infer modality from the request when obvious; otherwise default to image.",
        "Prioritize detailed positive direction. Keep negative_prompt brief and secondary.",
        "Return only JSON with this shape:",
        `{
  "modality": "image" | "video" | "audio",
  "prompt": "A dense production-ready prompt paragraph that already includes the critical shot details.",
  "aspect_ratio": "9:16" | "16:9" | "1:1",
  "subject": {
    "primary": "string",
    "age": "string",
    "wardrobe": "string",
    "appearance": "string",
    "action": "string",
    "emotion": "string",
    "color": "string"
  },
  "scene": {
    "location": "string",
    "setting": "string",
    "time_of_day": "string",
    "environment": "string",
    "background": "string",
    "atmosphere": "string"
  },
  "camera": {
    "shot_type": "string",
    "angle": "string",
    "lens": "string",
    "framing": "string",
    "movement": "string",
    "focus": "string",
    "reveal": "string"
  },
  "lighting": {
    "style": "string",
    "quality": "string",
    "direction": "string",
    "color": "string"
  },
  "style": {
    "aesthetic": "string",
    "color_palette": "string",
    "texture": "string"
  },
  "negative_prompt": "short optional string",
  "output": {
    "aspect_ratio": "9:16",
    "width": 1024,
    "height": 1792,
    "duration_seconds": 8
  },
  "parameters": {
    "subject_age": "4-5",
    "wardrobe": "casual summer attire"
  }
}`,
        `User request:\n${prompt}`,
      ].join("\n\n"),
      normalize: (input) => normalizePromptJsonOutput(input) as PromptJsonOutput,
    });

    return {
      message: "Prompt JSON ready.",
      status: "awaiting_approval",
      output: withStructuredRepairMetadata(
        parsed as unknown as Record<string, unknown>,
        repaired,
      ) as AgentToolResult["output"],
    };
  },
};
