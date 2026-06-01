import { z } from "zod";

import type { ProjectPatch } from "@/lib/agent/runtime-v4/patch/project-patch";
import type { CreativeWorkflow } from "@/lib/agent/runtime-v4/workflows/types";
import { toJsonObject } from "@/lib/agent/runtime-v4/workflows/types";

const inputSchema = z.object({
  target: z.enum(["hook", "script", "caption", "full_package"]),
  content: z.string().optional(),
  goal: z.string().optional(),
});

const outputSchema = z.object({
  scorecard: z.object({
    clarity: z.number(),
    specificity: z.number(),
    momentum: z.number(),
    fitToGoal: z.number(),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  specificImprovements: z.array(z.string()),
  improvedVersion: z.string(),
});

type ReviewInput = z.infer<typeof inputSchema>;
type ReviewOutput = z.infer<typeof outputSchema>;

function sourceContent(input: ReviewInput, context: Parameters<CreativeWorkflow<ReviewInput>["handler"]>[1]) {
  if (input.content?.trim()) return input.content.trim();
  if (input.target === "caption") return context.projectMind.scriptLab.caption;
  if (input.target === "hook") return context.projectMind.scriptLab.hook;
  return context.projectMind.scriptLab.script || context.projectMind.creativeBrief?.coreAngle || input.goal || "";
}

function outputFor(input: ReviewInput, content: string): ReviewOutput {
  const targetLabel = input.target.replace("_", " ");
  return {
    scorecard: {
      clarity: content ? 8 : 5,
      specificity: content.includes("SceneBook") ? 8 : 6,
      momentum: 7,
      fitToGoal: input.goal ? 8 : 7,
    },
    strengths: [
      "The piece has a clear creator workflow problem to anchor it.",
      "The SceneBook build story gives the content a concrete reason to exist.",
    ],
    weaknesses: [
      "The hook can become sharper by naming the pain in fewer words.",
      "The payoff should show one visible product moment, not just describe it.",
    ],
    specificImprovements: [
      "Open with the before-state: scattered ideas, scripts, shoot notes, and versions.",
      "Use one screen recording as proof within the first five seconds.",
      "Close with a build-log CTA instead of a generic product CTA.",
    ],
    improvedVersion: `Improved ${targetLabel}: I built SceneBook because every short-form idea kept turning into scattered notes, scripts, and assets. Now the whole reel workflow can move from angle to script to shoot pack in one workspace.`,
  };
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
  outputSchema,
  handler(input, context) {
    const content = sourceContent(input, context);
    const output = outputFor(input, content);

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
