import { z } from "zod";

import type { ProjectPatch } from "@/lib/agent/runtime-v4/patch/project-patch";
import type { CreativeWorkflow } from "@/lib/agent/runtime-v4/workflows/types";
import { toJsonObject } from "@/lib/agent/runtime-v4/workflows/types";
import { buildWorkflowContextBlock } from "@/lib/agent/runtime-v4/workflows/prompt-builders";
import { generateWorkflowStructured } from "@/lib/agent/runtime-v4/workflows/workflow-model";
import { fallbackAssetPromptPack } from "@/lib/agent/runtime-v4/workflows/workflow-fallbacks";
import { assetPromptPackOutputSchema, type AssetPromptPackOutput } from "@/lib/agent/runtime-v4/workflows/workflow-schemas";

const assetTypes = ["image", "broll", "voiceover", "music", "thumbnail"] as const;

const inputSchema = z.object({
  prompt: z.string().trim().min(1),
  assetTypes: z.array(z.enum(assetTypes)).optional(),
  visualStyle: z.string().optional(),
});

type AssetPromptPackInput = z.infer<typeof inputSchema>;

function patchFor(input: AssetPromptPackInput, output: AssetPromptPackOutput): ProjectPatch {
  return {
    title: "Save asset prompt pack",
    summary: "Save prompts for future image, B-roll, thumbnail, voiceover, and music generation.",
    riskLevel: "low",
    requiresApproval: false,
    operations: [
      {
        type: "create_project_artifact",
        input: {
          artifactType: "asset_prompt_pack",
          title: "Asset prompt pack",
          payload: toJsonObject(output),
          metadata: {
            workflowName: "create_asset_prompt_pack",
            requestedAssetTypes: input.assetTypes ?? assetTypes,
          },
        },
      },
      {
        type: "record_project_memory",
        input: {
          memoryType: "workflow_checkpoint",
          content: "Asset prompt pack prepared. No media was generated in Phase 8.",
          importance: "medium",
          metadata: { workflowName: "create_asset_prompt_pack" },
        },
      },
    ],
    metadata: { workflowName: "create_asset_prompt_pack" },
  };
}

export const assetPromptPackWorkflow: CreativeWorkflow<AssetPromptPackInput, AssetPromptPackOutput> = {
  name: "create_asset_prompt_pack",
  displayName: "Create Asset Prompt Pack",
  description: "Creates media prompt directions without generating external media.",
  inputSchema,
  outputSchema: assetPromptPackOutputSchema,
  async handler(input, context) {
    const visualStyle = input.visualStyle
      ?? context.projectMind.creativeBrief?.visualStyle
      ?? "honest founder-devlog with real product surfaces";
    const { output } = await generateWorkflowStructured({
      workflowName: "create_asset_prompt_pack",
      schema: assetPromptPackOutputSchema,
      schemaName: "AssetPromptPackOutput",
      schemaDescription: "Prompt artifacts for future media generation without creating media.",
      system: "You are SceneBook's asset prompt producer. Return prompt artifacts only; never claim media was generated.",
      prompt: [
        buildWorkflowContextBlock(context, input.prompt),
        `Requested asset types: ${(input.assetTypes ?? assetTypes).join(", ")}`,
        `Visual style: ${visualStyle}`,
      ].join("\n\n"),
      context,
      fallback: () => fallbackAssetPromptPack(input, context),
    });

    return {
      status: "completed",
      workflowName: "create_asset_prompt_pack",
      response: "Asset prompt pack prepared. No media was generated or published.",
      artifacts: [{
        type: "asset_prompt_pack",
        title: "Asset prompt pack",
        summary: output.thumbnailPrompt,
        payload: toJsonObject(output),
      }],
      patch: patchFor(input, output),
    };
  },
};
