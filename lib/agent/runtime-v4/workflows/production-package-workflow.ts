import { z } from "zod";

import type { ProjectPatch } from "@/lib/agent/runtime-v4/patch/project-patch";
import { buildWorkflowContextBlock } from "@/lib/agent/runtime-v4/workflows/prompt-builders";
import {
  fallbackAssetPromptPack,
  fallbackPlanReel,
  fallbackPublishPrep,
  fallbackScriptPackage,
  fallbackShootPack,
} from "@/lib/agent/runtime-v4/workflows/workflow-fallbacks";
import { generateWorkflowStructured } from "@/lib/agent/runtime-v4/workflows/workflow-model";
import {
  productionPackageOutputSchema,
  type ProductionPackageOutput,
} from "@/lib/agent/runtime-v4/workflows/workflow-schemas";
import type { CreativeWorkflow } from "@/lib/agent/runtime-v4/workflows/types";
import { toJsonObject } from "@/lib/agent/runtime-v4/workflows/types";

const inputSchema = z.object({
  prompt: z.string().trim().min(1),
  platform: z.string().optional(),
  format: z.string().optional(),
  tone: z.string().optional(),
  targetDurationSeconds: z.number().int().positive().optional(),
});

type ProductionPackageInput = z.infer<typeof inputSchema>;

function fallbackPackage(input: ProductionPackageInput, context: Parameters<CreativeWorkflow<ProductionPackageInput>["handler"]>[1]): ProductionPackageOutput {
  const plan = fallbackPlanReel(input, context);
  const scriptPackage = fallbackScriptPackage({
    prompt: input.prompt,
    selectedAngle: plan.angle,
    tone: input.tone,
    targetDurationSeconds: input.targetDurationSeconds,
  }, context);
  const shootPack = fallbackShootPack({ prompt: input.prompt, script: scriptPackage.script, visualStyle: plan.visualStyle }, context);
  const assetPromptPack = fallbackAssetPromptPack({ prompt: input.prompt, visualStyle: plan.visualStyle }, context);
  const publishPrep = fallbackPublishPrep({ prompt: input.prompt, platform: input.platform as "instagram" | "youtube_shorts" | "tiktok" | undefined }, context);

  return {
    plan,
    scriptPackage,
    shootPack,
    assetPromptPack,
    publishPrep,
    packageSummary: `Complete production package for ${context.projectMind.project.title}.`,
    nextBestAction: "Review the package, then collect missing shoot assets before manual publishing.",
  };
}

function patchFor(input: ProductionPackageInput, output: ProductionPackageOutput, context: Parameters<CreativeWorkflow<ProductionPackageInput>["handler"]>[1]): ProjectPatch {
  return {
    title: "Save full production package",
    summary: `Save plan, script, shoot pack, asset prompts, and publish prep for ${context.projectMind.project.title}.`,
    riskLevel: "low",
    requiresApproval: false,
    operations: [
      {
        type: "update_creative_brief",
        input: {
          audience: output.plan.audience,
          platform: input.platform ?? context.projectMind.creativeBrief?.platform ?? context.projectMind.project.platform,
          format: input.format ?? context.projectMind.creativeBrief?.format ?? context.projectMind.project.format,
          tone: input.tone ?? context.projectMind.creativeBrief?.tone,
          coreAngle: output.plan.angle,
          viewerPromise: output.plan.emotionalPromise,
          visualStyle: output.plan.visualStyle,
          cta: output.scriptPackage.cta,
          openQuestions: output.plan.openQuestions,
        },
      },
      {
        type: "update_active_goal",
        input: {
          title: `Produce ${context.projectMind.project.title}`,
          status: "active",
          stage: "asset_planning",
          nextActions: [output.nextBestAction],
          doneCriteria: ["Script package reviewed", "Shoot pack collected", "Publish package manually reviewed"],
        },
      },
      {
        type: "create_script_version",
        input: {
          title: `${context.projectMind.project.title} script`,
          script: output.scriptPackage.script,
          selectedHook: output.scriptPackage.selectedHook,
          status: "selected",
          angle: output.plan.angle,
          caption: output.scriptPackage.captionSeed,
          onScreenText: output.scriptPackage.onScreenText,
          cta: output.scriptPackage.cta,
          notes: output.scriptPackage.voiceover,
          metadata: { workflowName: "create_full_production_package", sourcePrompt: input.prompt },
        },
      },
      {
        type: "update_script_lab",
        input: {
          angle: output.plan.angle,
          hook: output.scriptPackage.selectedHook,
          script: output.scriptPackage.script,
          caption: output.publishPrep.caption,
          onScreenText: output.scriptPackage.onScreenText,
          cta: output.scriptPackage.cta,
          notes: output.scriptPackage.pacingNotes,
          overwrite: true,
        },
      },
      {
        type: "update_shoot_pack",
        input: {
          tasks: output.shootPack.aRoll,
          category: "aRoll",
          scenes: [
            ...output.shootPack.bRoll.map((label) => ({ label, category: "bRoll" })),
            ...output.shootPack.screenCaptures.map((label) => ({ label, category: "screenCaptures" })),
          ],
          assets: [
            ...output.shootPack.props.map((label) => ({ label, category: "props" })),
            ...output.shootPack.missingAssets.map((label) => ({ label, category: "missingAssets" })),
          ],
          visualNotes: output.shootPack.visualNotes,
          locationNotes: output.shootPack.locationNotes,
        },
      },
      {
        type: "create_project_artifact",
        input: {
          artifactType: "full_production_package",
          title: "Full production package",
          payload: toJsonObject(output),
          metadata: { workflowName: "create_full_production_package" },
        },
      },
      {
        type: "create_project_artifact",
        input: {
          artifactType: "asset_prompt_pack",
          title: "Asset prompt pack",
          payload: toJsonObject(output.assetPromptPack),
          metadata: { workflowName: "create_full_production_package" },
        },
      },
      {
        type: "create_project_artifact",
        input: {
          artifactType: "publish_package",
          title: "Publish package",
          payload: toJsonObject(output.publishPrep),
          metadata: { workflowName: "create_full_production_package", externalPublish: false },
        },
      },
      {
        type: "record_project_memory",
        input: {
          memoryType: "workflow_checkpoint",
          content: output.packageSummary,
          importance: "high",
          metadata: { workflowName: "create_full_production_package", sourcePrompt: input.prompt },
        },
      },
    ],
    metadata: { workflowName: "create_full_production_package", externalPublish: false },
  };
}

export const productionPackageWorkflow: CreativeWorkflow<ProductionPackageInput, ProductionPackageOutput> = {
  name: "create_full_production_package",
  displayName: "Create Full Production Package",
  description: "Creates the full plan, script package, shoot pack, asset prompt pack, and publish prep in one bounded workflow.",
  inputSchema,
  outputSchema: productionPackageOutputSchema,
  async handler(input, context) {
    const { output } = await generateWorkflowStructured({
      workflowName: "create_full_production_package",
      schema: productionPackageOutputSchema,
      schemaName: "ProductionPackageOutput",
      schemaDescription: "A complete bounded video production package.",
      system: "You are SceneBook's executive producer. Build one complete, grounded, shoot-ready production package. Never publish externally or generate media.",
      prompt: [
        buildWorkflowContextBlock(context, input.prompt),
        "Create the full bounded package: plan, script package, shoot pack, asset prompt pack, and manual publish prep.",
      ].join("\n\n"),
      context,
      fallback: () => fallbackPackage(input, context),
    });

    return {
      status: "completed",
      workflowName: "create_full_production_package",
      response: [
        output.packageSummary,
        `Hook: ${output.scriptPackage.selectedHook}`,
        `Scenes: ${output.shootPack.scenes.length}`,
        `Next: ${output.nextBestAction}`,
        "No media was generated and nothing was published externally.",
      ].join("\n"),
      artifacts: [
        {
          type: "full_production_package",
          title: "Full production package",
          summary: output.packageSummary,
          payload: toJsonObject(output),
        },
        {
          type: "asset_prompt_pack",
          title: "Asset prompt pack",
          summary: output.assetPromptPack.thumbnailPrompt,
          payload: toJsonObject(output.assetPromptPack),
        },
        {
          type: "publish_package",
          title: "Publish package",
          summary: output.publishPrep.caption,
          payload: toJsonObject(output.publishPrep),
        },
      ],
      patch: patchFor(input, output, context),
    };
  },
};
