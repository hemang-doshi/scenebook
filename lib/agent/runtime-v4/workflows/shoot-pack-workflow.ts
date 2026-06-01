import { z } from "zod";

import type { ProjectPatch } from "@/lib/agent/runtime-v4/patch/project-patch";
import type { CreativeWorkflow } from "@/lib/agent/runtime-v4/workflows/types";
import { toJsonObject } from "@/lib/agent/runtime-v4/workflows/types";

const inputSchema = z.object({
  prompt: z.string().trim().min(1),
  script: z.string().optional(),
  visualStyle: z.string().optional(),
});

const outputSchema = z.object({
  scenes: z.array(z.string()),
  aRoll: z.array(z.string()),
  bRoll: z.array(z.string()),
  screenCaptures: z.array(z.string()),
  props: z.array(z.string()),
  missingAssets: z.array(z.string()),
  visualNotes: z.string(),
  locationNotes: z.string(),
});

type ShootPackInput = z.infer<typeof inputSchema>;
type ShootPackOutput = z.infer<typeof outputSchema>;

function outputFor(input: ShootPackInput, visualStyle: string): ShootPackOutput {
  return {
    scenes: [
      "Founder on camera naming the scattered workflow problem.",
      "Screen capture of SceneBook moving from idea to script.",
      "Close-up of the script package and shoot prep outputs.",
      "Final direct-to-camera build-log CTA.",
    ],
    aRoll: [
      "Say the hook directly to camera in one take.",
      "Explain why SceneBook exists in under ten seconds.",
      "Record the CTA without sounding like a launch ad.",
    ],
    bRoll: [
      "Hands on keyboard while the project is open.",
      "Quick scroll through the SceneBook workspace.",
      "Messy notes or previous workflow artifacts beside the polished app.",
    ],
    screenCaptures: [
      "Project brief panel",
      "Script Lab with the selected hook",
      "Shoot pack checklist being created",
    ],
    props: ["Laptop", "microphone", "notebook with rough content ideas"],
    missingAssets: ["Clean screen recording", "one thumbnail frame", "caption-safe product shot"],
    visualNotes: input.visualStyle ?? visualStyle,
    locationNotes: "Desk setup or quiet workspace with enough light for a practical founder-devlog feel.",
  };
}

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
          title: "SceneBook launch reel shoot pack",
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
  outputSchema,
  handler(input, context) {
    const visualStyle = context.projectMind.creativeBrief?.visualStyle
      ?? "screen recordings, desk footage, and clean on-screen labels";
    const output = outputFor(input, visualStyle);

    return {
      status: "completed",
      workflowName: "create_shoot_pack",
      response: [`Shoot pack ready with ${output.scenes.length} scenes.`, `Visual notes: ${output.visualNotes}`].join("\n"),
      artifacts: [{
        type: "shoot_pack",
        title: "SceneBook launch reel shoot pack",
        summary: output.scenes.join(" / "),
        payload: toJsonObject(output),
      }],
      patch: patchFor(output),
    };
  },
};
