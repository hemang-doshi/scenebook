import { z } from "zod";

import { generateRuntimeV4Text } from "@/lib/agent/runtime-v4/model";
import type { ProjectPatch } from "@/lib/agent/runtime-v4/patch/project-patch";
import type { CreativeWorkflow, JsonObject } from "@/lib/agent/runtime-v4/workflows/types";
import { toJsonObject } from "@/lib/agent/runtime-v4/workflows/types";

const inputSchema = z.object({
  prompt: z.string().trim().min(1),
  platform: z.string().optional(),
  format: z.string().optional(),
  tone: z.string().optional(),
});

const outputSchema = z.object({
  angle: z.string(),
  audience: z.string(),
  emotionalPromise: z.string(),
  contentStructure: z.array(z.string()),
  visualStyle: z.string(),
  productionChecklist: z.array(z.string()),
  nextBestAction: z.string(),
});

type PlanReelInput = z.infer<typeof inputSchema>;
type PlanReelOutput = z.infer<typeof outputSchema>;

async function modelNote(input: PlanReelInput, context: Parameters<CreativeWorkflow<PlanReelInput>["handler"]>[1]) {
  try {
    const result = await generateRuntimeV4Text({
      profile: "final_response",
      system: "You are SceneBook's creative planning copilot. Return one concise planning note.",
      prompt: [
        `Project: ${context.projectMind.project.title}`,
        `Existing brief: ${JSON.stringify(context.compactProjectMind.creativeBrief)}`,
        `User prompt: ${input.prompt}`,
      ].join("\n\n"),
    }, { modelGateway: context.modelGateway });
    return result.text.trim();
  } catch {
    return "";
  }
}

function buildPlan(input: PlanReelInput, context: Parameters<CreativeWorkflow<PlanReelInput>["handler"]>[1]): PlanReelOutput {
  const brief = context.projectMind.creativeBrief;
  const platform = input.platform ?? brief?.platform ?? context.projectMind.project.platform ?? "instagram";
  const tone = input.tone ?? brief?.tone ?? "honest founder-devlog";

  return {
    angle: brief?.coreAngle || `Founder-devlog angle: show the real problem behind ${context.projectMind.project.title} and the build decisions that make it useful.`,
    audience: brief?.audience || "builders, creators, and indie teams who want a tighter short-form production workflow",
    emotionalPromise: brief?.viewerPromise || "Viewers should feel the product was built from a real creative bottleneck, not a pitch deck.",
    contentStructure: [
      "Cold open with the messy creator workflow problem.",
      "Show the SceneBook build moment or product surface that solves it.",
      "Name the before/after shift in one plain sentence.",
      "Close with the next build milestone or invitation to follow along.",
    ],
    visualStyle: brief?.visualStyle || `Screen recordings, candid desk footage, and simple captions with a ${tone} tone for ${platform}.`,
    productionChecklist: [
      "Record one direct-to-camera founder setup.",
      "Capture two SceneBook UI moments that show real work.",
      "Collect one rough notebook, terminal, or design-process cutaway.",
      "Keep the edit under 35 seconds unless the story needs more proof.",
      "End with one specific next action for the viewer.",
    ],
    nextBestAction: "Pick the strongest hook direction, then generate a script package.",
  };
}

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
  outputSchema,
  async handler(input, context) {
    const output = buildPlan(input, context);
    const note = await modelNote(input, context);
    const payload = toJsonObject(output) as JsonObject;

    return {
      status: "completed",
      workflowName: "plan_reel",
      response: [
        `Angle: ${output.angle}`,
        `Audience: ${output.audience}`,
        `Promise: ${output.emotionalPromise}`,
        `Next: ${output.nextBestAction}`,
        note ? `Model note: ${note}` : "",
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
