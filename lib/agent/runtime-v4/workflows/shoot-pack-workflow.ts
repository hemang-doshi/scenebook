import { z } from "zod";

import type { ProjectPatch } from "@/lib/agent/runtime-v4/patch/project-patch";
import type { CreativeWorkflow } from "@/lib/agent/runtime-v4/workflows/types";
import { toJsonObject } from "@/lib/agent/runtime-v4/workflows/types";
import { buildWorkflowContextBlock } from "@/lib/agent/runtime-v4/workflows/prompt-builders";
import { generateWorkflowStructured, workflowModelFailureResult } from "@/lib/agent/runtime-v4/workflows/workflow-model";
import { shootPackOutputSchema, type ShootPackOutput } from "@/lib/agent/runtime-v4/workflows/workflow-schemas";

const inputSchema = z.object({
  prompt: z.string().trim().min(1),
  script: z.string().optional(),
  visualStyle: z.string().optional(),
});

type ShootPackInput = z.infer<typeof inputSchema>;

function patchFor(output: ShootPackOutput): ProjectPatch {
  return {
    title: "Save shoot pack",
    summary: "Update shoot pack checklist and save the full production artifact.",
    riskLevel: "low",
    requiresApproval: false,
    operations: [
      {
        type: "update_shoot_pack",
        input: {
          tasks: output.aRoll,
          category: "aRoll",
          scenes: [
            ...output.bRoll.map((label) => ({ label, category: "bRoll" })),
            ...output.screenCaptures.map((label) => ({ label, category: "screenCaptures" })),
          ],
          assets: [
            ...output.props.map((label) => ({ label, category: "props" })),
            ...output.missingAssets.map((label) => ({ label, category: "missingAssets" })),
          ],
          visualNotes: output.visualNotes,
          locationNotes: output.locationNotes,
        },
      },
      {
        type: "create_project_artifact",
        input: {
          artifactType: "shoot_pack",
          title: "Shoot pack",
          payload: toJsonObject(output),
          metadata: { workflowName: "create_shoot_pack" },
        },
      },
    ],
    metadata: { workflowName: "create_shoot_pack" },
  };
}

export const shootPackWorkflow: CreativeWorkflow<ShootPackInput, ShootPackOutput> = {
  name: "create_shoot_pack",
  displayName: "Create Shoot Pack",
  description: "Creates a shot list, A-roll/B-roll checklist, screen captures, props, and missing assets.",
  inputSchema,
  outputSchema: shootPackOutputSchema,
  async handler(input, context) {
    const visualStyle = context.projectMind.creativeBrief?.visualStyle
      ?? "screen recordings, desk footage, and clean on-screen labels";
    const generated = await generateWorkflowStructured({
      workflowName: "create_shoot_pack",
      schema: shootPackOutputSchema,
      schemaName: "ShootPackOutput",
      schemaDescription: "A shoot pack with scenes, capture lists, assets, and feasibility notes.",
      system: "You are SceneBook's producer preparing a practical shoot pack. Return structured output only.",
      prompt: [
        buildWorkflowContextBlock(context, input.prompt),
        `Visual style to respect: ${input.visualStyle ?? visualStyle}`,
        `Script override, if provided:\n${input.script ?? ""}`,
      ].join("\n\n"),
      context,
    });
    if (generated.status === "failed") {
      return workflowModelFailureResult("create_shoot_pack", generated.metadata);
    }
    const output = generated.output;

    return {
      status: "completed",
      workflowName: "create_shoot_pack",
      response: [`Shoot pack ready with ${output.scenes.length} scenes.`, `Visual notes: ${output.visualNotes}`].join("\n"),
      artifacts: [{
        type: "shoot_pack",
        title: "Shoot pack",
        summary: output.scenes.join(" / "),
        payload: toJsonObject(output),
      }],
      patch: patchFor(output),
    };
  },
};
