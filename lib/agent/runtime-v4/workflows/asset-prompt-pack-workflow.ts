import { z } from "zod";

import type { ProjectPatch } from "@/lib/agent/runtime-v4/patch/project-patch";
import type { CreativeWorkflow } from "@/lib/agent/runtime-v4/workflows/types";
import { toJsonObject } from "@/lib/agent/runtime-v4/workflows/types";

const assetTypes = ["image", "broll", "voiceover", "music", "thumbnail"] as const;

const inputSchema = z.object({
  prompt: z.string().trim().min(1),
  assetTypes: z.array(z.enum(assetTypes)).optional(),
  visualStyle: z.string().optional(),
});

const outputSchema = z.object({
  cinematicJsonPrompts: z.array(z.record(z.string(), z.unknown())),
  imagePrompts: z.array(z.string()),
  brollPrompts: z.array(z.string()),
  thumbnailPrompt: z.string(),
  voiceoverDirection: z.string(),
  musicDirection: z.string(),
});

type AssetPromptPackInput = z.infer<typeof inputSchema>;
type AssetPromptPackOutput = z.infer<typeof outputSchema>;

function outputFor(input: AssetPromptPackInput, visualStyle: string): AssetPromptPackOutput {
  return {
    cinematicJsonPrompts: [
      {
        scene: "founder desk setup",
        style: visualStyle,
        camera: "handheld close medium shot",
        mood: "focused, practical, not corporate",
        negativePrompt: "stock photo, glossy SaaS ad, fake team, heavy gradients",
      },
      {
        scene: "SceneBook workspace screen recording",
        style: "clean product UI capture with readable cursor movement",
        camera: "screen capture",
        mood: "clear build-in-public proof",
      },
    ],
    imagePrompts: [
      `Documentary still of a founder building SceneBook at a laptop, ${visualStyle}, natural light, realistic workspace.`,
      "Clean product screenshot frame showing idea, script, and shoot pack panels without fake text overlays.",
    ],
    brollPrompts: [
      "Slow push-in on hands typing while a short-form video project is open.",
      "Cursor moving from creative brief to script package to shoot checklist.",
    ],
    thumbnailPrompt: "Founder at laptop plus readable SceneBook UI, text: Building the video workflow I needed.",
    voiceoverDirection: "Conversational founder narration, close mic, short sentences, no announcer energy.",
    musicDirection: "Low-key optimistic electronic bed, light pulse, leave space for voiceover.",
  };
}

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
          title: "SceneBook launch reel asset prompt pack",
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
  outputSchema,
  handler(input, context) {
    const visualStyle = input.visualStyle
      ?? context.projectMind.creativeBrief?.visualStyle
      ?? "honest founder-devlog with real product surfaces";
    const output = outputFor(input, visualStyle);

    return {
      status: "completed",
      workflowName: "create_asset_prompt_pack",
      response: "Asset prompt pack prepared. No media was generated or published.",
      artifacts: [{
        type: "asset_prompt_pack",
        title: "SceneBook launch reel asset prompt pack",
        summary: output.thumbnailPrompt,
        payload: toJsonObject(output),
      }],
      patch: patchFor(input, output),
    };
  },
};
