import { z } from "zod";

import type { AgentPlugin, AgentRuntimeTool } from "@/lib/agent/runtime-v2/tools/types";
import { assetTypes } from "@/lib/types";

const generatePromptJsonInputSchema = z.object({
  prompt: z.string().min(1),
  modality: z.enum(["image", "video", "audio"]).optional(),
  aspectRatio: z.string().optional(),
  durationSeconds: z.number().positive().optional(),
});

const generateMediaAssetInputSchema = z.object({
  prompt: z.string().min(1),
  type: z.enum(["image", "video", "audio"]),
  model: z.string().optional(),
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

function notImplementedHandler(): never {
  throw new Error("Not implemented");
}

export const generatePromptJsonTool: AgentRuntimeTool<GeneratePromptJsonInput> = {
  name: "generate_prompt_json",
  displayName: "Generate Prompt JSON",
  description: "Turns a plain creative prompt into structured generation-ready prompt JSON.",
  inputSchema: generatePromptJsonInputSchema,
  sideEffect: "none",
  approvalPolicy: "auto",
  handler: notImplementedHandler,
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

export const generateMediaAssetTool: AgentRuntimeTool<GenerateMediaAssetInput> = {
  name: "generate_media_asset",
  displayName: "Generate Media Asset",
  description: "Requests image, video, or audio generation from the configured media pipeline.",
  inputSchema: generateMediaAssetInputSchema,
  sideEffect: "asset_generation",
  approvalPolicy: "auto",
  handler: notImplementedHandler,
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

export const createAssetFolderTool: AgentRuntimeTool<CreateAssetFolderInput> = {
  name: "create_asset_folder",
  displayName: "Create Asset Folder",
  description: "Creates a workspace asset folder for organizing project media.",
  inputSchema: createAssetFolderInputSchema,
  sideEffect: "db_write",
  approvalPolicy: "auto",
  handler: notImplementedHandler,
  displayFormatter: (input) => ({
    title: "Create Asset Folder",
    subtitle: input.name,
    metadata: {
      sideEffect: "db_write",
      approvalPolicy: "auto",
    },
  }),
};

export const moveAssetToFolderTool: AgentRuntimeTool<MoveAssetToFolderInput> = {
  name: "move_asset_to_folder",
  displayName: "Move Asset to Folder",
  description: "Moves an existing asset into the selected asset folder.",
  inputSchema: moveAssetToFolderInputSchema,
  sideEffect: "db_write",
  approvalPolicy: "ask_if_overwrite",
  handler: notImplementedHandler,
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

export const attachAssetToProjectTool: AgentRuntimeTool<AttachAssetToProjectInput> = {
  name: "attach_asset_to_project",
  displayName: "Attach Asset to Project",
  description: "Links a generated or library asset to the active project.",
  inputSchema: attachAssetToProjectInputSchema,
  sideEffect: "db_write",
  approvalPolicy: "ask_if_overwrite",
  handler: notImplementedHandler,
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
