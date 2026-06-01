import { z } from "zod";

import type { ProjectPatch } from "@/lib/agent/runtime-v4/patch/project-patch";
import type { CreativeWorkflow } from "@/lib/agent/runtime-v4/workflows/types";
import { toJsonObject } from "@/lib/agent/runtime-v4/workflows/types";

const inputSchema = z.object({
  prompt: z.string().trim().min(1),
  selectedAngle: z.string().optional(),
  tone: z.string().optional(),
  targetDurationSeconds: z.number().int().positive().optional(),
});

const outputSchema = z.object({
  hookOptions: z.array(z.string()),
  selectedHook: z.string(),
  script: z.string(),
  voiceover: z.string(),
  onScreenText: z.string(),
  cta: z.string(),
  captionSeed: z.string(),
});

type ScriptPackageInput = z.infer<typeof inputSchema>;
type ScriptPackageOutput = z.infer<typeof outputSchema>;

function buildOutput(input: ScriptPackageInput, angle: string): ScriptPackageOutput {
  const tone = input.tone ?? "honest, specific, founder-led";
  const selectedHook = `I started building SceneBook because making short-form videos had too many scattered steps.`;

  return {
    hookOptions: [
      selectedHook,
      "The hardest part of making a reel was not editing. It was keeping the idea alive.",
      "This is the tool I wanted every time a video idea turned into five disconnected tabs.",
    ],
    selectedHook,
    script: [
      selectedHook,
      `So I am building it around one workflow: plan the angle, write the script, prep the shoot, and save every useful version in one place.`,
      `The angle for this piece is ${angle}.`,
      `The goal is not to make the process look polished. The goal is to show the real production system being built underneath it.`,
      "If you are building, creating, or documenting your work, follow along. This is the build log.",
    ].join("\n"),
    voiceover: `Use a ${tone} voiceover. Keep sentences short and let the screen captures prove the workflow.`,
    onScreenText: "Building the short-form video workspace I needed\nIdea -> script -> shoot pack -> saved versions",
    cta: "Follow the SceneBook build log.",
    captionSeed: "Building SceneBook in public: the short-form workflow tool I kept wishing existed.",
  };
}

function patchFor(input: ScriptPackageInput, output: ScriptPackageOutput, angle: string): ProjectPatch {
  return {
    title: "Save script package",
    summary: "Create a script version, update Script Lab, and save the script package artifact.",
    riskLevel: "low",
    requiresApproval: false,
    operations: [
      {
        type: "create_script_version",
        input: {
          title: "SceneBook launch reel script",
          script: output.script,
          selectedHook: output.selectedHook,
          status: "selected",
          angle,
          caption: output.captionSeed,
          onScreenText: output.onScreenText,
          cta: output.cta,
          notes: output.voiceover,
          metadata: { workflowName: "create_script_package", sourcePrompt: input.prompt },
        },
      },
      {
        type: "update_script_lab",
        input: {
          angle,
          hook: output.selectedHook,
          script: output.script,
          caption: output.captionSeed,
          onScreenText: output.onScreenText,
          cta: output.cta,
          notes: output.voiceover,
          overwrite: true,
        },
      },
      {
        type: "create_project_artifact",
        input: {
          artifactType: "script_package",
          title: "SceneBook launch reel script package",
          payload: toJsonObject(output),
          metadata: { workflowName: "create_script_package" },
        },
      },
      {
        type: "record_project_memory",
        input: {
          memoryType: "selected_output",
          content: `Selected script hook: ${output.selectedHook}`,
          importance: "medium",
          metadata: { outputType: "script_package", title: "SceneBook launch reel script package" },
        },
      },
    ],
    metadata: { workflowName: "create_script_package" },
  };
}

export const scriptPackageWorkflow: CreativeWorkflow<ScriptPackageInput, ScriptPackageOutput> = {
  name: "create_script_package",
  displayName: "Create Script Package",
  description: "Generates hook options, a selected hook, script, voiceover notes, captions, and save patch.",
  inputSchema,
  outputSchema,
  handler(input, context) {
    const angle = input.selectedAngle
      ?? context.projectMind.creativeBrief?.coreAngle
      ?? "an honest founder-devlog about building SceneBook from a real creator workflow problem";
    const output = buildOutput(input, angle);

    return {
      status: "completed",
      workflowName: "create_script_package",
      response: [`Recommended hook: ${output.selectedHook}`, "", output.script, "", `Caption seed: ${output.captionSeed}`].join("\n"),
      artifacts: [{
        type: "script_package",
        title: "SceneBook launch reel script package",
        summary: output.selectedHook,
        payload: toJsonObject(output),
      }],
      patch: patchFor(input, output, angle),
    };
  },
};
