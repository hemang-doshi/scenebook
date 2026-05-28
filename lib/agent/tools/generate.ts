/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";

import type { PromptJsonOutput } from "@/lib/agent/types";
import type { AgentTool, AgentToolResult } from "@/lib/agent/tools/types";
import { normalizePromptJsonOutput } from "@/lib/agent/tools/structured-output";
import { getModelById } from "@/lib/ai/model-registry";
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

function convertPromptJsonToText(json: PromptJsonOutput) {
  const lines = [json.prompt];

  if (json.subject) {
    lines.push(renderSpecLine("Subject", json.subject));
  }
  if (json.scene) {
    lines.push(renderSpecLine("Scene", json.scene));
  }
  if (json.camera) {
    lines.push(renderSpecLine("Camera", json.camera));
  }
  if (json.lighting) {
    lines.push(renderSpecLine("Lighting", json.lighting));
  }
  if (json.style) {
    lines.push(renderSpecLine("Style", json.style));
  }
  if (json.output) {
    lines.push(renderSpecLine("Output", json.output));
  }

  return lines.filter(Boolean).join("\n");
}

function parsePromptJson(value: string): PromptJsonOutput | null {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return normalizePromptJsonOutput(parsed as Record<string, unknown>);
  } catch {
    return null;
  }
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
    let parsedPromptJson: PromptJsonOutput | null = null;

    if (firstWord === "image" || firstWord === "video" || firstWord === "audio") {
      modality = firstWord;
      promptText = parts.slice(1).join(" ").trim();
    } else {
      promptText = rawInput;
    }

    if (!modality) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(promptText);
      if (isUuid) {
        try {
          const rawSupabase = await createSupabaseServerClient();
          const { data: toolCall } = await (rawSupabase as any)
            .from("agent_tool_calls")
            .select("*")
            .eq("id", promptText)
            .maybeSingle();
          if (toolCall && toolCall.output) {
            const promptOutput = normalizePromptJsonOutput(toolCall.output);
            parsedPromptJson = promptOutput;
            modality = promptOutput.modality;
          }
        } catch {
          // Ignore
        }
      } else {
        parsedPromptJson = parsePromptJson(promptText);
        if (parsedPromptJson) {
          modality = parsedPromptJson.modality;
        }
      }
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
      const { data: toolCall } = await (rawSupabase as any)
        .from("agent_tool_calls")
        .select("*")
        .eq("id", approvedPromptId)
        .maybeSingle();

      if (toolCall && toolCall.output) {
        parsedPromptJson = normalizePromptJsonOutput(toolCall.output);
        finalPrompt = convertPromptJsonToText(parsedPromptJson);
      }
    } else {
      parsedPromptJson = parsePromptJson(promptText);
      if (parsedPromptJson) {
        finalPrompt = convertPromptJsonToText(parsedPromptJson);
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

    let result: Awaited<ReturnType<typeof generateProjectMedia>>;
    try {
      result = await generateProjectMedia({
        projectId: ctx.projectId,
        userId,
        prompt: finalPrompt,
        modality,
        modelId,
        structuredPrompt: parsedPromptJson ? sanitizeStructuredPrompt(parsedPromptJson) : undefined,
        parameters: parsedPromptJson?.parameters,
        negativePrompt: parsedPromptJson?.negative_prompt,
      });
    } catch (caught) {
      const selectedPreset = modelId ? getModelById(modelId) : null;
      return {
        message: caught instanceof Error ? caught.message : "Failed to perform inference.",
        status: "failed",
        output: {
          kind: "media_error",
          modality,
          model: modelId ?? "default",
          provider: selectedPreset?.provider ?? "huggingface",
          message: caught instanceof Error ? caught.message : "Failed to perform inference.",
          recoverable: true,
        },
      } as AgentToolResult;
    }

    return {
      message: `${modality.toUpperCase()} generated successfully.`,
      output: {
        kind: "media_asset",
        assetId: result.assetId,
        generationId: result.generationId,
        url: result.url,
        folderId: result.folderId,
        folderName: result.folderName,
        model: result.model,
        provider: result.provider,
        prompt: result.prompt,
        modality,
        negative_prompt: parsedPromptJson?.negative_prompt,
        parameters: parsedPromptJson?.parameters,
      },
    } as AgentToolResult;
  },
};

export const generateImageTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Generate Image",
  command: "generate-image",
  description: "Generates project image using Hugging Face.",
  inputSchema,
  requiresApproval: false,
  sideEffect: "asset_generation",
  async handler(ctx, input) {
    return generateTool.handler(ctx, { prompt: "image " + input.prompt });
  },
};

export const generateVideoTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Generate Video",
  command: "generate-video",
  description: "Generates project video using Hugging Face.",
  inputSchema,
  requiresApproval: false,
  sideEffect: "asset_generation",
  async handler(ctx, input) {
    return generateTool.handler(ctx, { prompt: "video " + input.prompt });
  },
};

export const generateAudioTool: AgentTool<z.infer<typeof inputSchema>> = {
  name: "Generate Audio",
  command: "generate-audio",
  description: "Generates project audio using Hugging Face.",
  inputSchema,
  requiresApproval: false,
  sideEffect: "asset_generation",
  async handler(ctx, input) {
    return generateTool.handler(ctx, { prompt: "audio " + input.prompt });
  },
};

function renderSpecLine(label: string, value: Record<string, unknown>) {
  const parts = Object.values(value)
    .filter((entry) => typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean")
    .map((entry) => String(entry).trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  return `${label}: ${parts.join("; ")}`;
}

function sanitizeStructuredPrompt(prompt: PromptJsonOutput) {
  return JSON.parse(JSON.stringify(prompt)) as Record<string, unknown>;
}
