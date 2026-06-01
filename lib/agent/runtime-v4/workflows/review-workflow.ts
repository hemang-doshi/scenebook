import { z } from "zod";

import type { ProjectPatch } from "@/lib/agent/runtime-v4/patch/project-patch";
import type { CreativeWorkflow } from "@/lib/agent/runtime-v4/workflows/types";
import { toJsonObject } from "@/lib/agent/runtime-v4/workflows/types";
import { buildWorkflowContextBlock } from "@/lib/agent/runtime-v4/workflows/prompt-builders";
import { generateWorkflowStructured } from "@/lib/agent/runtime-v4/workflows/workflow-model";
import { fallbackReview } from "@/lib/agent/runtime-v4/workflows/workflow-fallbacks";
import { reviewOutputSchema, type ReviewOutput } from "@/lib/agent/runtime-v4/workflows/workflow-schemas";

const inputSchema = z.object({
  target: z.enum(["hook", "script", "caption", "full_package"]),
  content: z.string().optional(),
  goal: z.string().optional(),
});

type ReviewInput = z.infer<typeof inputSchema>;

function sourceContent(input: ReviewInput, context: Parameters<CreativeWorkflow<ReviewInput>["handler"]>[1]) {
  if (input.content?.trim()) return input.content.trim();
  if (input.target === "caption") return context.projectMind.scriptLab.caption;
  if (input.target === "hook") return context.projectMind.scriptLab.hook;
  return context.projectMind.scriptLab.script || context.projectMind.creativeBrief?.coreAngle || input.goal || "";
}

function patchFor(input: ReviewInput, output: ReviewOutput): ProjectPatch {
  return {
    title: "Save content review",
    summary: `Save critique and improved ${input.target}.`,
    riskLevel: "low",
    requiresApproval: false,
    operations: [
      {
        type: "create_project_artifact",
        input: {
          artifactType: "content_review",
          title: `Review: ${input.target}`,
          payload: toJsonObject(output),
          metadata: { workflowName: "review_content", target: input.target },
        },
      },
      {
        type: "record_project_memory",
        input: {
          memoryType: "workflow_checkpoint",
          content: `Reviewed ${input.target}: ${output.specificImprovements[0]}`,
          importance: "medium",
          metadata: { workflowName: "review_content" },
        },
      },
    ],
    metadata: { workflowName: "review_content" },
  };
}

export const reviewWorkflow: CreativeWorkflow<ReviewInput, ReviewOutput> = {
  name: "review_content",
  displayName: "Review Content",
  description: "Critiques hooks, scripts, captions, or a full creative package.",
  inputSchema,
  outputSchema: reviewOutputSchema,
  async handler(input, context) {
    const content = sourceContent(input, context);
    const { output } = await generateWorkflowStructured({
      workflowName: "review_content",
      profile: "critique",
      schema: reviewOutputSchema,
      schemaName: "ReviewOutput",
      schemaDescription: "A critique rubric, specific improvements, and a stronger version.",
      system: "You are SceneBook's exacting creative reviewer. Return structured critique only.",
      prompt: [
        buildWorkflowContextBlock(context, input.goal ?? `Review ${input.target}`),
        `Review target: ${input.target}`,
        `Content to review:\n${content}`,
        "Use a real critique rubric. Preserve what works, identify what to cut, and avoid generic advice.",
      ].join("\n\n"),
      context,
      fallback: () => fallbackReview(input, content, context),
    });

    return {
      status: "completed",
      workflowName: "review_content",
      response: [`Score: ${output.scorecard.fitToGoal}/10 fit to goal`, output.specificImprovements.join("\n"), "", output.improvedVersion].join("\n"),
      artifacts: [{
        type: "content_review",
        title: `Review: ${input.target}`,
        summary: output.specificImprovements[0],
        payload: toJsonObject(output),
      }],
      patch: patchFor(input, output),
    };
  },
};
