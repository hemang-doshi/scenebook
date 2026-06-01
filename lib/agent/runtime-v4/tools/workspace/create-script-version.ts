import { z } from "zod";

import { createScriptVersion, loadScriptVersion } from "@/lib/agent/runtime-v3/memory/script-version-store";
import type { AgentTool } from "@/lib/agent/runtime-v4/tools/types";
import type { JsonValue } from "@/lib/types";

type JsonObject = Record<string, JsonValue>;

const jsonObjectSchema = z.record(z.string(), z.unknown()) as z.ZodType<JsonObject>;

const createScriptVersionInput = z.object({
  title: z.string().trim().min(1),
  script: z.string().trim().min(1),
  selectedHook: z.string().optional(),
  status: z.enum(["draft", "selected", "final"]).default("draft"),
  angle: z.string().optional(),
  outline: z.string().optional(),
  caption: z.string().optional(),
  onScreenText: z.string().optional(),
  cta: z.string().optional(),
  notes: z.string().optional(),
  metadata: jsonObjectSchema.optional(),
});

type CreateScriptVersionInput = z.infer<typeof createScriptVersionInput>;

function checkedAt() {
  return new Date().toISOString();
}

function requireThreadId(threadId: string | undefined) {
  if (!threadId) {
    throw new Error("A thread id is required to create a script version.");
  }

  return threadId;
}

function toJsonObject(value: unknown): JsonObject {
  return JSON.parse(JSON.stringify(value ?? {})) as JsonObject;
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortJson(entry)]),
    );
  }

  return value;
}

function matches(expected: unknown, actual: unknown) {
  return JSON.stringify(sortJson(expected)) === JSON.stringify(sortJson(actual));
}

function buildScriptLab(input: CreateScriptVersionInput): JsonObject {
  return {
    angle: input.angle ?? "",
    hook: input.selectedHook ?? "",
    outline: input.outline ?? "",
    script: input.script,
    caption: input.caption ?? "",
    onScreenText: input.onScreenText ?? "",
    cta: input.cta ?? "",
    notes: input.notes ?? "",
  };
}

export const createScriptVersionTool: AgentTool<CreateScriptVersionInput, JsonObject> = {
  name: "create_script_version",
  displayName: "Create Script Version",
  description: "Creates a versioned Script Lab draft, selected script, or final script.",
  inputSchema: createScriptVersionInput,
  outputSchema: jsonObjectSchema,
  riskLevel: "low",
  sideEffect: "workspace",
  approvalPolicy: "never",
  availability: "available",
  async handler(input, context) {
    const threadId = requireThreadId(context.threadId);
    const status = input.status ?? "draft";
    const version = await createScriptVersion({
      ownerId: context.userId,
      projectId: context.projectId,
      threadId,
      toolCallId: context.toolCallId ?? null,
      title: input.title,
      scriptLab: buildScriptLab(input),
      active: status === "selected" || status === "final",
      metadata: {
        ...(input.metadata ?? {}),
        status,
      },
    });

    return {
      kind: "script_version",
      versionId: version.id,
      title: version.title,
      status,
      active: version.active,
      script: input.script,
    };
  },
  async verify(input, output, context) {
    const versionId = typeof output.versionId === "string" ? output.versionId : null;
    const status = input.status ?? "draft";
    const expectedActive = status === "selected" || status === "final";
    const expectedScriptLab = buildScriptLab(input);
    const expectedMetadata = {
      ...(input.metadata ?? {}),
      status,
    };
    const actual = versionId
      ? await loadScriptVersion({ projectId: context.projectId, versionId })
      : null;
    const verified = Boolean(
      actual &&
        actual.title === input.title &&
        matches(expectedScriptLab, actual.scriptLab) &&
        actual.active === expectedActive &&
        matches(expectedMetadata, actual.metadata),
    );

    return {
      verified,
      checkedAt: checkedAt(),
      expected: {
        title: input.title,
        script: input.script,
        scriptLab: expectedScriptLab,
        active: expectedActive,
        status,
        metadata: expectedMetadata,
      },
      actual: toJsonObject(actual),
      output,
      reason: verified ? undefined : "Script version re-read did not match the requested title and script.",
    };
  },
};
