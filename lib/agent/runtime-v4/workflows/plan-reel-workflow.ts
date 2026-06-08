import { z } from "zod";

import type { ProjectPatch } from "@/lib/agent/runtime-v4/patch/project-patch";
import type { CreativeWorkflow, JsonObject } from "@/lib/agent/runtime-v4/workflows/types";
import { toJsonObject } from "@/lib/agent/runtime-v4/workflows/types";
import { buildWorkflowContextBlock } from "@/lib/agent/runtime-v4/workflows/prompt-builders";
import { generateWorkflowStructured, workflowModelFailureResult } from "@/lib/agent/runtime-v4/workflows/workflow-model";
import { planReelOutputSchema, type PlanReelOutput } from "@/lib/agent/runtime-v4/workflows/workflow-schemas";

const inputSchema = z.object({
  prompt: z.string().trim().min(1),
  platform: z.string().optional(),
  format: z.string().optional(),
  tone: z.string().optional(),
});

type PlanReelInput = z.infer<typeof inputSchema>;

function patchFor(input: PlanReelInput, output: PlanReelOutput, context: Parameters<CreativeWorkflow<PlanReelInput>["handler"]>[1]): ProjectPatch {
  return {
    title: "Save reel creative direction",
    summary: `Save the creative brief and active goal for ${context.projectMind.project.title}.`,
    riskLevel: "low",
    requiresApproval: false,
    operations: [
      {
        type: "update_creative_brief",
        input: {
          audience: output.audience,
          platform: input.platform ?? context.projectMind.creativeBrief?.platform ?? context.projectMind.project.platform,
          format: input.format ?? context.projectMind.creativeBrief?.format ?? context.projectMind.project.format,
          tone: input.tone ?? context.projectMind.creativeBrief?.tone ?? "honest founder-devlog",
          coreAngle: output.angle,
          viewerPromise: output.emotionalPromise,
          visualStyle: output.visualStyle,
          cta: "Follow the build and watch the next SceneBook milestone.",
        },
      },
      {
        type: "update_active_goal",
        input: {
          title: "Produce the SceneBook build reel",
          status: "active",
          stage: "briefing",
          nextActions: [output.nextBestAction, "Turn the plan into a script package."],
          doneCriteria: ["Creative angle approved", "Script package drafted", "Shoot pack created"],
        },
      },
      {
        type: "record_project_memory",
        input: {
          memoryType: "creative_direction",
          content: `Reel direction: ${output.angle}`,
          importance: "high",
          metadata: toJsonObject({ sourcePrompt: input.prompt, output }),
        },
      },
    ],
    metadata: {
      workflowName: "plan_reel",
    },
  };
}

export const planReelWorkflow: CreativeWorkflow<PlanReelInput, PlanReelOutput> = {
  name: "plan_reel",
  displayName: "Plan Reel",
  description: "Turns a vague reel idea into a creative direction, structure, and production plan.",
  inputSchema,
  outputSchema: planReelOutputSchema,
  async handler(input, context) {
    const generated = await generateWorkflowStructured({
      workflowName: "plan_reel",
      schema: planReelOutputSchema,
      schemaName: "PlanReelOutput",
      schemaDescription: "A grounded short-form creative direction and production plan.",
      system: "You are SceneBook's senior creative producer. Return adaptive, project-specific structured output only.",
      prompt: [
        buildWorkflowContextBlock(context, input.prompt),
        "Generate a reel plan that is specific to this project. If essential context is missing, list only the essential openQuestions.",
      ].join("\n\n"),
      context,
    });
    if (generated.status === "failed") {
      return workflowModelFailureResult("plan_reel", generated.metadata);
    }
    const output = generated.output;

    if (output.openQuestions.length > 0 && context.projectMind.readiness.briefCompleteness < 30) {
      return {
        status: "needs_input",
        workflowName: "plan_reel",
        questions: output.openQuestions.slice(0, 3),
        reason: "The reel direction needs a little more creative context before saving a plan.",
      };
    }

    const payload = toJsonObject(output) as JsonObject;

    return {
      status: "completed",
      workflowName: "plan_reel",
      response: [
        `Angle: ${output.angle}`,
        `Audience: ${output.audience}`,
        `Promise: ${output.emotionalPromise}`,
        `Next: ${output.nextBestAction}`,
      ].filter(Boolean).join("\n"),
      artifacts: [{
        type: "creative_brief",
        title: "Reel production plan",
        summary: output.angle,
        payload,
      }],
      patch: patchFor(input, output, context),
    };
  },
};
