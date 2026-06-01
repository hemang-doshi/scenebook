import { z } from "zod";

import { listProjectMemories, saveProjectMemory } from "@/lib/agent/runtime-v4/memory/project-mind";
import { projectMemoryTypes } from "@/lib/agent/runtime-v4/memory/memory-types";
import type { AgentTool } from "@/lib/agent/runtime-v4/tools/types";
import type { JsonValue } from "@/lib/types";

type JsonObject = Record<string, JsonValue>;

const jsonObjectSchema = z.record(z.string(), z.unknown()) as z.ZodType<JsonObject>;

const recordProjectMemoryInput = z.object({
  memoryType: z.enum(projectMemoryTypes),
  content: z.string().trim().min(1),
  importance: z.enum(["low", "medium", "high"]).default("medium"),
  source: z.enum(["user", "agent", "system", "integration"]).default("agent"),
  confidence: z.number().min(0).max(1).default(1),
  userApproved: z.boolean().default(false),
  metadata: jsonObjectSchema.optional(),
  supersedesMemoryId: z.string().optional(),
});

type RecordProjectMemoryInput = z.infer<typeof recordProjectMemoryInput>;

function checkedAt() {
  return new Date().toISOString();
}

function toJsonObject(value: unknown): JsonObject {
  return JSON.parse(JSON.stringify(value ?? {})) as JsonObject;
}

export const recordProjectMemoryTool: AgentTool<RecordProjectMemoryInput, JsonObject> = {
  name: "record_project_memory",
  displayName: "Record Project Memory",
  description: "Stores a durable ProjectMind memory for the current project.",
  inputSchema: recordProjectMemoryInput,
  outputSchema: jsonObjectSchema,
  riskLevel: "low",
  sideEffect: "workspace",
  approvalPolicy: "never",
  availability: "available",
  async handler(input, context) {
    const importance = input.importance ?? "medium";
    const source = input.source ?? "agent";
    const confidence = input.confidence ?? 1;
    const userApproved = input.userApproved ?? false;
    const memory = await saveProjectMemory({
      projectId: context.projectId,
      threadId: context.threadId,
      runId: context.runId,
      toolCallId: context.toolCallId ?? null,
      memoryType: input.memoryType,
      summary: input.content,
      content: {
        ...(input.metadata ?? {}),
        importance,
      },
      source,
      confidence,
      userApproved,
      supersedesMemoryId: input.supersedesMemoryId ?? null,
    });

    return {
      kind: "project_memory",
      memoryId: memory.id,
      memoryType: memory.memoryType,
      summary: memory.summary,
      importance,
    };
  },
  async verify(input, output, context) {
    const memoryId = typeof output.memoryId === "string" ? output.memoryId : null;
    const memories = await listProjectMemories(context.projectId, 50);
    const actual = memories.find((memory) =>
      memoryId
        ? memory.id === memoryId
        : memory.memoryType === input.memoryType && memory.summary === input.content,
    ) ?? null;
    const verified = Boolean(
      actual &&
        actual.memoryType === input.memoryType &&
        actual.summary === input.content,
    );

    return {
      verified,
      checkedAt: checkedAt(),
      expected: {
        memoryId,
        memoryType: input.memoryType,
        summary: input.content,
      },
      actual: toJsonObject(actual),
      output,
      reason: verified ? undefined : "ProjectMind memory could not be re-read.",
    };
  },
};
