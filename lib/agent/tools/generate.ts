import { z } from "zod";

import type { AgentTool, AgentToolResult } from "@/lib/agent/tools/types";
import { generateProjectMedia } from "@/lib/generation/generate-media";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  prompt: z.string().trim(),
});

function isTooVague(prompt: string) {
  const words = prompt
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  return words.length < 4 || prompt.length < 24;
}

interface PromptJson {
  scene?: string;
  intent?: string;
  subject?: string;
  visual_style?: string;
  camera?: string;
  lighting?: string;
  motion?: string;
}

function convertJsonPromptToText(json: PromptJson, modality: string): string {
  if (modality === "audio") {
    return json.scene || json.intent || json.subject || "";
  }
  const parts = [];
  if (json.scene) {
    parts.push(json.scene);
  } else if (json.subject) {
    parts.push(json.subject);
  }
  if (json.visual_style) parts.push(`Style: ${json.visual_style}`);
  if (json.camera) parts.push(`Camera: ${json.camera}`);
  if (json.lighting) parts.push(`Lighting: ${json.lighting}`);
  if (modality === "video" && json.motion) {
    parts.push(`Motion: ${json.motion}`);
  }
  return parts.join(". ").trim();
}

export const generateTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Generate Media",
  command: "generate",
  description: "Generates project media (image/video/audio) using Hugging Face.",
  inputSchema,
  requiresApproval: false,
  sideEffect: "asset_generation",
  async handler(ctx, input) {
    const rawInput = input.prompt.trim();
    const parts = rawInput.split(/\s+/);
    const firstWord = parts[0]?.toLowerCase();

    let modality: "image" | "video" | "audio" | null = null;
    let promptText = "";

    if (firstWord === "image" || firstWord === "video" || firstWord === "audio") {
      modality = firstWord;
      promptText = parts.slice(1).join(" ").trim();
    } else {
      promptText = rawInput;
    }

    if (!modality) {
      return {
        message: "Please choose a modality: image, video, or audio. Example: `/generate image neon product hero frame`.",
        output: {
          missingModality: true,
          prompt: promptText,
        },
      } as AgentToolResult;
    }

    if (!promptText) {
      return {
        message: `Please provide a prompt for generating the ${modality}. Example: \`/generate ${modality} a cinematic close-up\`.`,
        output: {
          missingPrompt: true,
          modality,
        },
      } as AgentToolResult;
    }

    const rawSupabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await rawSupabase.auth.getUser();
    const userId = user?.id ?? ctx.project?.ownerId;
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    let finalPrompt = promptText;
    let approvedPromptId: string | null = null;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(promptText);
    if (isUuid) {
      approvedPromptId = promptText;
      const toolCallClient = rawSupabase as unknown as {
        from: (table: string) => {
          select: (cols?: string) => {
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{ data: { output?: PromptJson } | null; error: unknown }>;
            };
          };
        };
      };
      const { data: toolCall } = await toolCallClient
        .from("agent_tool_calls")
        .select("*")
        .eq("id", approvedPromptId)
        .maybeSingle();

      if (toolCall && toolCall.output) {
        finalPrompt = convertJsonPromptToText(toolCall.output, modality);
      }
    } else {
      try {
        const parsed = JSON.parse(promptText);
        if (parsed && typeof parsed === "object") {
          finalPrompt = convertJsonPromptToText(parsed, modality);
        }
      } catch {
        // Not a JSON string
      }
    }

    let isRough = false;
    if (!isUuid) {
      try {
        JSON.parse(promptText);
      } catch {
        if (isTooVague(promptText)) {
          isRough = true;
        }
      }
    }

    if (isRough) {
      return {
        message: "This prompt looks a bit rough. We recommend using `/form-json-prompt` first to expand it into a structured cinematic prompt.",
        output: {
          suggestFormJsonPrompt: true,
          prompt: promptText,
        },
      } as AgentToolResult;
    }

    const modelId = ctx.selectedModels?.[modality] || ctx.selectedModel || undefined;

    const result = await generateProjectMedia({
      projectId: ctx.projectId,
      userId,
      prompt: finalPrompt,
      modality,
      modelId,
    });

    return {
      message: `${modality.toUpperCase()} generated successfully.`,
      output: {
        assetId: result.assetId,
        generationId: result.generationId,
        url: result.url,
        folderId: result.folderId,
        folderName: result.folderName,
        model: result.model,
        provider: result.provider,
        prompt: result.prompt,
        modality,
      },
    } as AgentToolResult;
  },
};
