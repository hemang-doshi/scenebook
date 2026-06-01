import { z } from "zod";

import type { ProjectPatch } from "@/lib/agent/runtime-v4/patch/project-patch";
import type { CreativeWorkflow } from "@/lib/agent/runtime-v4/workflows/types";
import { toJsonObject } from "@/lib/agent/runtime-v4/workflows/types";
import { buildWorkflowContextBlock } from "@/lib/agent/runtime-v4/workflows/prompt-builders";
import { generateWorkflowStructured } from "@/lib/agent/runtime-v4/workflows/workflow-model";
import { fallbackScriptPackage } from "@/lib/agent/runtime-v4/workflows/workflow-fallbacks";
import { scriptPackageOutputSchema, type ScriptPackageOutput } from "@/lib/agent/runtime-v4/workflows/workflow-schemas";

const inputSchema = z.object({
  prompt: z.string().trim().min(1),
  selectedAngle: z.string().optional(),
  tone: z.string().optional(),
  targetDurationSeconds: z.number().int().positive().optional(),
});

type ScriptPackageInput = z.infer<typeof inputSchema>;

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
          title: `${angle.slice(0, 72)} script`,
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
          title: "Script package",
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
          metadata: { outputType: "script_package", title: "Script package" },
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
  outputSchema: scriptPackageOutputSchema,
  async handler(input, context) {
    const angle = input.selectedAngle
      ?? context.projectMind.creativeBrief?.coreAngle
      ?? `a specific short-form story about ${context.projectMind.project.title}`;
    const { output } = await generateWorkflowStructured({
      workflowName: "create_script_package",
      schema: scriptPackageOutputSchema,
      schemaName: "ScriptPackageOutput",
      schemaDescription: "Hook options, script, voiceover, captions, structure, and pacing notes.",
      system: "You are SceneBook's short-form script producer. Return project-specific structured output only.",
      prompt: [
        buildWorkflowContextBlock(context, input.prompt),
        `Selected angle: ${angle}`,
        "Write a script package that adapts to the existing brief, rejected outputs, current script state, platform, and creator preferences.",
      ].join("\n\n"),
      context,
      fallback: () => fallbackScriptPackage(input, context),
    });

    return {
      status: "completed",
      workflowName: "create_script_package",
      response: [`Recommended hook: ${output.selectedHook}`, "", output.script, "", `Caption seed: ${output.captionSeed}`].join("\n"),
      artifacts: [{
        type: "script_package",
        title: "Script package",
        summary: output.selectedHook,
        payload: toJsonObject(output),
      }],
      patch: patchFor(input, output, angle),
    };
  },
};
