import { z } from "zod";

import { getProjectWorkspace, updateCard } from "@/lib/data/repository";
import type { AgentTool } from "@/lib/agent/runtime-v4/tools/types";
import type { JsonValue, ScriptLab } from "@/lib/types";

type JsonObject = Record<string, JsonValue>;

const jsonObjectSchema = z.record(z.string(), z.unknown()) as z.ZodType<JsonObject>;

const scriptLabInput = z.object({
  angle: z.string().optional(),
  hook: z.string().optional(),
  outline: z.string().optional(),
  script: z.string().optional(),
  caption: z.string().optional(),
  onScreenText: z.string().optional(),
  cta: z.string().optional(),
  notes: z.string().optional(),
  overwrite: z.boolean().optional(),
});

type UpdateScriptLabInput = z.infer<typeof scriptLabInput>;

function checkedAt() {
  return new Date().toISOString();
}

function toJsonObject(value: unknown): JsonObject {
  return JSON.parse(JSON.stringify(value ?? {})) as JsonObject;
}

function scriptPatch(input: UpdateScriptLabInput): Partial<ScriptLab> {
  const { overwrite, ...patch } = input;
  void overwrite;
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<ScriptLab>;
}

export const updateScriptLabTool: AgentTool<UpdateScriptLabInput, JsonObject> = {
  name: "update_script_lab",
  displayName: "Update Script Lab",
  description: "Updates selected Script Lab fields on the current project.",
  inputSchema: scriptLabInput,
  outputSchema: jsonObjectSchema,
  riskLevel: "low",
  sideEffect: "workspace",
  approvalPolicy: "never",
  availability: "available",
  async handler(input, context) {
    const project = await getProjectWorkspace(context.projectId);
    if (!project) {
      throw new Error("Project not found.");
    }

    const patch = scriptPatch(input);
    if (Object.keys(patch).length === 0) {
      throw new Error("No Script Lab fields were provided.");
    }

    const updated = await updateCard(context.projectId, {
      scriptLab: {
        ...project.scriptLab,
        ...patch,
      },
    });

    return {
      kind: "script_lab_update",
      changedFields: Object.keys(patch),
      patch: toJsonObject(patch),
      scriptLab: toJsonObject(updated.scriptLab),
    };
  },
  async verify(input, output, context) {
    const patch = scriptPatch(input);
    const project = await getProjectWorkspace(context.projectId);
    const verified = Boolean(
      project &&
        Object.entries(patch).every(([field, expected]) =>
          project.scriptLab[field as keyof ScriptLab] === expected,
        ),
    );

    return {
      verified,
      checkedAt: checkedAt(),
      expected: toJsonObject(patch),
      actual: toJsonObject(project?.scriptLab ?? null),
      output,
      reason: verified ? undefined : "Script Lab re-read did not match the requested patch.",
    };
  },
};
