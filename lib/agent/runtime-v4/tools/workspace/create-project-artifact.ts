import { z } from "zod";

import { createProjectArtifact } from "@/lib/agent/artifacts";
import type { AgentTool } from "@/lib/agent/runtime-v4/tools/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JsonValue } from "@/lib/types";

type JsonObject = Record<string, JsonValue>;

const jsonObjectSchema = z.record(z.string(), z.unknown()) as z.ZodType<JsonObject>;

const artifactInput = z.object({
  artifactType: z.string().trim().min(1).optional(),
  type: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1),
  payload: jsonObjectSchema.optional(),
  content: jsonObjectSchema.optional(),
  metadata: jsonObjectSchema.optional(),
}).refine((value) => Boolean(value.artifactType ?? value.type), {
  message: "artifactType or type is required.",
}).refine((value) => Boolean(value.payload ?? value.content), {
  message: "payload or content is required.",
});

type CreateProjectArtifactInput = z.infer<typeof artifactInput>;

function checkedAt() {
  return new Date().toISOString();
}

function requireThreadId(threadId: string | undefined) {
  if (!threadId) {
    throw new Error("A thread id is required to create a project artifact.");
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

async function loadArtifact(projectId: string, artifactId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_artifacts")
    .select("*")
    .eq("project_id", projectId)
    .eq("id", artifactId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export const createProjectArtifactTool: AgentTool<CreateProjectArtifactInput, JsonObject> = {
  name: "create_project_artifact",
  displayName: "Create Project Artifact",
  description: "Creates a typed project artifact for durable workspace output.",
  inputSchema: artifactInput,
  outputSchema: jsonObjectSchema,
  riskLevel: "low",
  sideEffect: "workspace",
  approvalPolicy: "never",
  availability: "available",
  async handler(input, context) {
    const threadId = requireThreadId(context.threadId);
    const artifactType = input.artifactType ?? input.type;
    const payload = input.payload ?? input.content;

    if (!artifactType || !payload) {
      throw new Error("artifactType/type and payload/content are required.");
    }

    const artifact = await createProjectArtifact({
      projectId: context.projectId,
      threadId,
      toolCallId: context.toolCallId ?? null,
      artifactType,
      title: input.title,
      payload,
      metadata: input.metadata,
    });

    return {
      kind: "project_artifact",
      artifactId: String(artifact.id),
      artifactType,
      title: input.title,
    };
  },
  async verify(input, output, context) {
    const artifactId = typeof output.artifactId === "string" ? output.artifactId : null;
    const actual = artifactId ? await loadArtifact(context.projectId, artifactId) : null;
    const artifactType = input.artifactType ?? input.type;
    const payload = input.payload ?? input.content;
    const verified = Boolean(
      actual &&
        actual.id === artifactId &&
        actual.artifact_type === artifactType &&
        actual.title === input.title &&
        matches(payload, actual.payload) &&
        (input.metadata === undefined || matches(input.metadata, actual.metadata)),
    );

    return {
      verified,
      checkedAt: checkedAt(),
      expected: {
        artifactId,
        artifactType: artifactType ?? null,
        title: input.title,
        payload: payload ?? null,
        metadata: input.metadata ?? null,
      },
      actual: toJsonObject(actual),
      output,
      reason: verified ? undefined : "Project artifact could not be re-read.",
    };
  },
};
