import { z } from "zod";

import {
  defaultNegativePrompt,
  inferAssetAspectRatio,
  inferAssetModality,
  type RuntimeAssetModality,
} from "@/lib/agent/runtime-v2/asset-intent";
import {
  generateStructuredCommandUpdate,
  normalizePromptJsonOutput,
  withStructuredRepairMetadata,
} from "@/lib/agent/tools/structured-output";
import type { PromptJsonOutput } from "@/lib/agent/types";
import type { AgentPlugin, AgentRuntimeTool } from "@/lib/agent/runtime-v2/tools/types";
import { getModelById } from "@/lib/ai/model-registry";
import {
  getOrCreateAssetFolderPath,
  moveAssetToFolder as moveAssetToFolderRecord,
} from "@/lib/assets/asset-folders";
import { generateProjectMedia } from "@/lib/generation/generate-media";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assetTypes, type JsonValue } from "@/lib/types";

const generatePromptJsonInputSchema = z.object({
  prompt: z.string().min(1),
  modality: z.enum(["image", "video", "audio"]).optional(),
  aspectRatio: z.string().optional(),
  durationSeconds: z.number().positive().optional(),
  platform: z.string().optional(),
  folderIntent: z.string().optional(),
  visualStyle: z.string().optional(),
});

const generateMediaAssetInputSchema = z.object({
  prompt: z.string().min(1),
  type: z.enum(["image", "video", "audio"]),
  model: z.string().optional(),
  provider: z.string().optional(),
  folderId: z.string().nullable().optional(),
  folderName: z.string().optional(),
  title: z.string().optional(),
  negativePrompt: z.string().optional(),
  parameters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  structuredPrompt: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const createAssetFolderInputSchema = z.object({
  name: z.string().min(1),
  parentFolderId: z.string().nullable().optional(),
});

const moveAssetToFolderInputSchema = z.object({
  assetId: z.string().min(1),
  folderId: z.string().nullable(),
});

const attachAssetToProjectInputSchema = z.object({
  assetId: z.string().min(1),
  projectId: z.string().optional(),
  type: z.enum(assetTypes).optional(),
});

type GeneratePromptJsonInput = z.infer<typeof generatePromptJsonInputSchema>;
type GenerateMediaAssetInput = z.infer<typeof generateMediaAssetInputSchema>;
type CreateAssetFolderInput = z.infer<typeof createAssetFolderInputSchema>;
type MoveAssetToFolderInput = z.infer<typeof moveAssetToFolderInputSchema>;
type AttachAssetToProjectInput = z.infer<typeof attachAssetToProjectInputSchema>;

type PromptJsonToolOutput = Record<string, JsonValue> & PromptJsonOutput;

type MediaAssetToolOutput = Record<string, JsonValue> & {
  kind: "media_asset";
  assetId: string;
  generationId: string;
  url: string;
  storagePath: string;
  path: string;
  folderId: string | null;
  folderName: string;
  model: string;
  provider: string;
  prompt: string;
  modality: RuntimeAssetModality;
};

type AssetFolderToolOutput = Record<string, JsonValue> & {
  kind: "asset_folder";
  folderId: string;
  folderName: string;
  path: string;
  alreadyExisted: boolean;
};

type AssetMoveToolOutput = Record<string, JsonValue> & {
  kind: "asset_folder_move";
  assetId: string;
  folderId: string | null;
  moved: boolean;
};

type AssetAttachmentToolOutput = Record<string, JsonValue> & {
  kind: "project_asset_attachment";
  projectId: string;
  assetId: string;
  attached: boolean;
  alreadyAttached: boolean;
};

export const generatePromptJsonTool: AgentRuntimeTool<GeneratePromptJsonInput, PromptJsonToolOutput> = {
  name: "generate_prompt_json",
  displayName: "Generate Prompt JSON",
  description: "Turns a plain creative prompt into structured generation-ready prompt JSON.",
  inputSchema: generatePromptJsonInputSchema,
  sideEffect: "none",
  approvalPolicy: "auto",
  async handler(ctx, input) {
    const modality = input.modality ?? inferAssetModality(input.prompt) ?? "image";
    const aspectRatio = normalizeAspectRatio(
      input.aspectRatio ?? inferAssetAspectRatio(input.prompt, ctx.project),
    );
    const negativePrompt = defaultNegativePrompt(modality);

    const { output: parsed, repaired } = await generateStructuredCommandUpdate({
      ctx: {
        projectId: ctx.projectId,
        threadId: ctx.threadId ?? "",
        runId: ctx.runId ?? "",
        rawInput: ctx.rawInput ?? input.prompt,
        project: ctx.project,
        selectedModel: ctx.selectedModel,
        selectedModels: ctx.selectedModels,
        emitProgress: ctx.emitProgress,
      },
      command: "form-json-prompt",
      prompt: [
        "Turn this asset request into strict generation prompt JSON.",
        "Infer only missing details that are strongly implied by the project or request.",
        `Modality: ${modality}`,
        `Aspect ratio default: ${aspectRatio}. Instagram Reels, TikTok, and YouTube Shorts should use 9:16.`,
        input.durationSeconds ? `Duration seconds: ${input.durationSeconds}` : null,
        input.platform ? `Platform: ${input.platform}` : null,
        input.folderIntent ? `Asset purpose or folder: ${input.folderIntent}` : null,
        input.visualStyle ? `Visual or audio style: ${input.visualStyle}` : null,
        "Include a concise negative_prompt when it would reduce common generation artifacts.",
        "Return only JSON compatible with this shape:",
        `{
  "modality": "image" | "video" | "audio",
  "prompt": "dense production-ready prompt paragraph",
  "negative_prompt": "short optional string",
  "aspect_ratio": "9:16" | "16:9" | "1:1",
  "subject": {},
  "scene": {},
  "camera": {},
  "lighting": {},
  "style": {},
  "output": { "aspect_ratio": "${aspectRatio}", "duration_seconds": 8 },
  "parameters": {}
}`,
        `User request:\n${input.prompt}`,
      ].filter(Boolean).join("\n\n"),
      normalize: (raw) => normalizePromptJsonWithDefaults(raw, {
        modality,
        aspectRatio,
        durationSeconds: input.durationSeconds,
        negativePrompt,
      }),
    });

    const output = withStructuredRepairMetadata({
      ...parsed,
      metadata: {
        model: ctx.selectedModels?.chat ?? ctx.selectedModel ?? null,
        folderIntent: input.folderIntent ?? null,
      },
    }, repaired) as PromptJsonToolOutput;

    return {
      message: "Prompt JSON generated.",
      output,
    };
  },
  displayFormatter: (input) => ({
    title: "Generate Prompt JSON",
    subtitle: input.prompt,
    metadata: {
      modality: input.modality,
      sideEffect: "none",
      approvalPolicy: "auto",
    },
  }),
};

export const generateMediaAssetTool: AgentRuntimeTool<GenerateMediaAssetInput, MediaAssetToolOutput> = {
  name: "generate_media_asset",
  displayName: "Generate Media Asset",
  description: "Requests image, video, or audio generation from the configured media pipeline.",
  inputSchema: generateMediaAssetInputSchema,
  sideEffect: "asset_generation",
  approvalPolicy: "auto",
  async handler(ctx, input) {
    await ctx.emitProgress?.(`generating ${input.type}`);

    const rawSupabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await rawSupabase.auth.getUser();
    const userId = user?.id ?? ctx.project?.ownerId;

    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const modelId = resolveMediaModel(input.type, ctx.selectedModels, input.model, ctx.selectedModel);
    const selectedPreset = modelId ? getModelById(modelId) : null;
    const provider = input.provider ?? selectedPreset?.provider;
    const structuredPrompt = input.structuredPrompt
      ? sanitizeRecord(input.structuredPrompt)
      : isRecord(input.metadata?.structuredPrompt)
        ? sanitizeRecord(input.metadata.structuredPrompt)
        : undefined;
    const parameters = input.parameters ?? (
      isRecord(input.metadata?.parameters)
        ? normalizeParameters(input.metadata.parameters)
        : undefined
    );
    const prompt = structuredPrompt
      ? convertPromptJsonToText(normalizePromptJsonOutput(structuredPrompt))
      : input.prompt;

    const result = await generateProjectMedia({
      projectId: ctx.projectId,
      userId,
      prompt,
      modality: input.type,
      modelId,
      provider,
      negativePrompt: input.negativePrompt,
      parameters,
      structuredPrompt,
      title: input.title,
      folderId: input.folderId ?? undefined,
    });

    return {
      message: `${input.type.toUpperCase()} generated and saved to the project.`,
      output: {
        kind: "media_asset",
        assetId: result.assetId,
        generationId: result.generationId,
        url: result.url,
        storagePath: result.path,
        path: result.path,
        folderId: result.folderId,
        folderName: result.folderName,
        model: result.model,
        provider: result.provider,
        prompt: result.prompt,
        modality: input.type,
        ...(input.negativePrompt ? { negative_prompt: input.negativePrompt } : {}),
        ...(parameters ? { parameters: toJsonRecord(parameters) } : {}),
      },
    };
  },
  displayFormatter: (input) => ({
    title: "Generate Media Asset",
    subtitle: input.prompt,
    metadata: {
      type: input.type,
      model: input.model,
      sideEffect: "asset_generation",
      approvalPolicy: "auto",
    },
  }),
};

export const createAssetFolderTool: AgentRuntimeTool<CreateAssetFolderInput, AssetFolderToolOutput> = {
  name: "create_asset_folder",
  displayName: "Create Asset Folder",
  description: "Creates a workspace asset folder for organizing project media.",
  inputSchema: createAssetFolderInputSchema,
  sideEffect: "db_write",
  approvalPolicy: "auto",
  async handler(ctx, input) {
    const result = await getOrCreateAssetFolderPath(
      ctx.projectId,
      input.name,
      input.parentFolderId ?? null,
    );

    return {
      message: result.alreadyExisted
        ? `Reused asset folder ${result.path}.`
        : `Created asset folder ${result.path}.`,
      output: {
        kind: "asset_folder",
        folderId: result.folder.id,
        folderName: result.folder.name,
        path: result.path,
        alreadyExisted: result.alreadyExisted,
      },
    };
  },
  displayFormatter: (input) => ({
    title: "Create Asset Folder",
    subtitle: input.name,
    metadata: {
      sideEffect: "db_write",
      approvalPolicy: "auto",
    },
  }),
};

export const moveAssetToFolderTool: AgentRuntimeTool<MoveAssetToFolderInput, AssetMoveToolOutput> = {
  name: "move_asset_to_folder",
  displayName: "Move Asset to Folder",
  description: "Moves an existing asset into the selected asset folder.",
  inputSchema: moveAssetToFolderInputSchema,
  sideEffect: "db_write",
  approvalPolicy: "ask_if_overwrite",
  async handler(ctx, input) {
    if (!input.folderId) {
      return {
        message: "Asset folder move skipped because no folder was selected.",
        output: {
          kind: "asset_folder_move",
          assetId: input.assetId,
          folderId: null,
          moved: false,
        },
      };
    }

    await moveAssetToFolderRecord(ctx.projectId, input.assetId, input.folderId);

    return {
      message: "Asset moved to folder.",
      output: {
        kind: "asset_folder_move",
        assetId: input.assetId,
        folderId: input.folderId,
        moved: true,
      },
    };
  },
  displayFormatter: (input) => ({
    title: "Move Asset to Folder",
    subtitle: input.assetId,
    metadata: {
      folderId: input.folderId,
      sideEffect: "db_write",
      approvalPolicy: "ask_if_overwrite",
    },
  }),
};

export const attachAssetToProjectTool: AgentRuntimeTool<AttachAssetToProjectInput, AssetAttachmentToolOutput> = {
  name: "attach_asset_to_project",
  displayName: "Attach Asset to Project",
  description: "Links a generated or library asset to the active project.",
  inputSchema: attachAssetToProjectInputSchema,
  sideEffect: "db_write",
  approvalPolicy: "ask_if_overwrite",
  handler: (ctx, input) => ({
    message: "Asset is attached to the project library.",
    output: {
      kind: "project_asset_attachment",
      projectId: input.projectId ?? ctx.projectId,
      assetId: input.assetId,
      attached: true,
      alreadyAttached: true,
      ...(input.type ? { type: input.type } : {}),
    },
  }),
  displayFormatter: (input) => ({
    title: "Attach Asset to Project",
    subtitle: input.assetId,
    metadata: {
      projectId: input.projectId,
      type: input.type,
      sideEffect: "db_write",
      approvalPolicy: "ask_if_overwrite",
    },
  }),
};

export const assetsPlugin: AgentPlugin = {
  name: "assets",
  description: "Prompt JSON creation, media generation, asset folders, and project asset links.",
  capabilities: ["prompt_json", "media_generation", "asset_folders", "project_asset_links"],
  tools: [
    generatePromptJsonTool,
    generateMediaAssetTool,
    createAssetFolderTool,
    moveAssetToFolderTool,
    attachAssetToProjectTool,
  ],
};

function normalizePromptJsonWithDefaults(
  raw: Record<string, unknown>,
  defaults: {
    modality: RuntimeAssetModality;
    aspectRatio: "9:16" | "16:9" | "1:1";
    durationSeconds?: number;
    negativePrompt: string;
  },
): PromptJsonOutput {
  const rawOutput = isRecord(raw.output) ? raw.output : {};
  const merged = {
    ...raw,
    modality: raw.modality ?? defaults.modality,
    aspect_ratio: raw.aspect_ratio ?? rawOutput.aspect_ratio ?? defaults.aspectRatio,
    negative_prompt: raw.negative_prompt ?? defaults.negativePrompt,
    output: {
      ...rawOutput,
      aspect_ratio: rawOutput.aspect_ratio ?? raw.aspect_ratio ?? defaults.aspectRatio,
      ...(defaults.durationSeconds && !rawOutput.duration_seconds
        ? { duration_seconds: defaults.durationSeconds }
        : {}),
    },
  };

  return normalizePromptJsonOutput(merged);
}

function normalizeAspectRatio(value: string): "9:16" | "16:9" | "1:1" {
  if (value === "16:9" || value === "1:1") {
    return value;
  }

  return "9:16";
}

function resolveMediaModel(
  modality: RuntimeAssetModality,
  selectedModels?: Record<string, string> | null,
  inputModel?: string,
  selectedModel?: string | null,
) {
  if (selectedModels?.[modality]) {
    return selectedModels[modality];
  }

  if (inputModel) {
    return inputModel;
  }

  const fallback = selectedModel ? getModelById(selectedModel) : null;
  return fallback && "modality" in fallback && fallback.modality === modality
    ? selectedModel ?? undefined
    : undefined;
}

function convertPromptJsonToText(json: PromptJsonOutput) {
  const lines = [json.prompt];

  if (json.subject) lines.push(renderSpecLine("Subject", json.subject));
  if (json.scene) lines.push(renderSpecLine("Scene", json.scene));
  if (json.camera) lines.push(renderSpecLine("Camera", json.camera));
  if (json.lighting) lines.push(renderSpecLine("Lighting", json.lighting));
  if (json.style) lines.push(renderSpecLine("Style", json.style));
  if (json.output) lines.push(renderSpecLine("Output", json.output));

  return lines.filter(Boolean).join("\n");
}

function renderSpecLine(label: string, value: Record<string, unknown>) {
  const parts = Object.values(value)
    .filter((entry) => typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean")
    .map((entry) => String(entry).trim())
    .filter(Boolean);

  return parts.length > 0 ? `${label}: ${parts.join("; ")}` : "";
}

function sanitizeRecord(input: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
}

function normalizeParameters(input: Record<string, unknown>) {
  const entries = Object.entries(input).filter(([, value]) =>
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
  );

  return entries.length > 0
    ? Object.fromEntries(entries) as Record<string, string | number | boolean>
    : undefined;
}

function toJsonRecord(input: Record<string, unknown>): Record<string, JsonValue> {
  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [key, toJsonValue(value)] as const)
      .filter((entry): entry is readonly [string, JsonValue] => entry[1] !== undefined),
  );
}

function toJsonValue(value: unknown): JsonValue | undefined {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toJsonValue).filter((item): item is JsonValue => item !== undefined);
  }

  if (isRecord(value)) {
    return toJsonRecord(value);
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
