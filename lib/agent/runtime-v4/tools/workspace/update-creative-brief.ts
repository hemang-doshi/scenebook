import { z } from "zod";

import { loadCreativeBrief, upsertCreativeBrief } from "@/lib/agent/runtime-v3/memory/creative-brief-store";
import type { CreativeBriefState } from "@/lib/agent/runtime-v3/types";
import type { AgentTool } from "@/lib/agent/runtime-v4/tools/types";
import type { JsonValue } from "@/lib/types";

type JsonObject = Record<string, JsonValue>;

const jsonObjectSchema = z.record(z.string(), z.unknown()) as z.ZodType<JsonObject>;

const creativeBriefInput = z.object({
  audience: z.string().optional(),
  platform: z.string().optional(),
  format: z.string().optional(),
  durationSeconds: z.number().int().positive().optional(),
  tone: z.string().optional(),
  coreAngle: z.string().optional(),
  coreMessage: z.string().optional(),
  viewerPromise: z.string().optional(),
  viewerEmotion: z.string().optional(),
  creatorPersona: z.string().optional(),
  visualStyle: z.string().optional(),
  cta: z.string().optional(),
  constraints: z.array(z.string()).optional(),
  assumptions: z.array(z.string()).optional(),
  rejectedDirections: z.array(z.string()).optional(),
  openQuestions: z.array(z.string()).optional(),
  approvedFields: z.array(z.string()).optional(),
});

type UpdateCreativeBriefInput = z.infer<typeof creativeBriefInput>;

function checkedAt() {
  return new Date().toISOString();
}

function toJsonObject(value: unknown): JsonObject {
  return JSON.parse(JSON.stringify(value ?? {})) as JsonObject;
}

function removeUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

function mapBriefPatch(input: UpdateCreativeBriefInput): CreativeBriefState {
  return removeUndefined({
    audience: input.audience,
    platform: input.platform,
    format: input.format,
    durationSeconds: input.durationSeconds,
    tone: input.tone,
    coreAngle: input.coreMessage ?? input.coreAngle,
    viewerPromise: input.viewerPromise,
    viewerEmotion: input.viewerEmotion,
    creatorPersona: input.creatorPersona,
    visualStyle: input.visualStyle,
    cta: input.cta,
    constraints: input.constraints,
    assumptions: input.assumptions,
    rejectedDirections: input.rejectedDirections,
    openQuestions: input.openQuestions,
    approvedFields: input.approvedFields,
  }) as CreativeBriefState;
}

function matches(expected: unknown, actual: unknown) {
  return JSON.stringify(expected) === JSON.stringify(actual);
}

export const updateCreativeBriefTool: AgentTool<UpdateCreativeBriefInput, JsonObject> = {
  name: "update_creative_brief",
  displayName: "Update Creative Brief",
  description: "Upserts canonical creative brief fields for the current project.",
  inputSchema: creativeBriefInput,
  outputSchema: jsonObjectSchema,
  riskLevel: "low",
  sideEffect: "workspace",
  approvalPolicy: "never",
  availability: "available",
  async handler(input, context) {
    const patch = mapBriefPatch(input);

    if (Object.keys(patch).length === 0) {
      throw new Error("No creative brief fields were provided.");
    }

    const brief = await upsertCreativeBrief({
      ownerId: context.userId,
      projectId: context.projectId,
      patch,
    });

    return {
      kind: "creative_brief",
      changedFields: Object.keys(patch),
      brief: toJsonObject(brief),
    };
  },
  async verify(input, output, context) {
    const patch = mapBriefPatch(input);
    const actual = await loadCreativeBrief(context.projectId);
    const changedFields = Object.keys(patch);
    const verified = Boolean(
      actual &&
        changedFields.every((field) =>
          matches(patch[field as keyof CreativeBriefState], actual[field as keyof CreativeBriefState]),
        ),
    );

    return {
      verified,
      checkedAt: checkedAt(),
      expected: toJsonObject(patch),
      actual: toJsonObject(actual),
      output,
      reason: verified ? undefined : "Creative brief re-read did not match the requested patch.",
    };
  },
};

