import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, test, vi } from "vitest";

import { agentDecisionSchema } from "@/lib/agent/runtime-v4/decision/schemas";
import { createExecuteStepNode } from "@/lib/agent/runtime-v4/graph/nodes/execute-step";
import { buildRunSummaryFromObservations } from "@/lib/agent/runtime-v4/memory/run-summary-store";
import { PatchExecutor } from "@/lib/agent/runtime-v4/patch/patch-executor";
import { projectPatchExecutionResultToObservation } from "@/lib/agent/runtime-v4/patch/patch-results";
import {
  mapProjectPatchOperationToToolName,
  projectPatchSchema,
  type ProjectPatch,
} from "@/lib/agent/runtime-v4/patch/project-patch";
import type { ToolExecutionContext, ToolExecutionResult } from "@/lib/agent/runtime-v4/tools/types";

const context: ToolExecutionContext = {
  userId: "user-1",
  projectId: "project-1",
  threadId: "thread-1",
  runId: "run-1",
  source: "test",
};

const patch: ProjectPatch = {
  title: "Save SceneBook launch direction",
  summary: "Save launch reel direction, active goal, and memory.",
  reason: "The user asked to save this workspace state.",
  riskLevel: "low",
  requiresApproval: false,
  operations: [
    {
      type: "update_creative_brief",
      input: {
        tone: "honest founder-devlog",
      },
    },
    {
      type: "record_project_memory",
      input: {
        memoryType: "creative_direction",
        content: "Keep this honest and devlog-like.",
        importance: "high",
      },
    },
  ],
};

function completed(toolName: string): ToolExecutionResult {
  return {
    toolName,
    status: "completed",
    output: { ok: true },
    startedAt: "2026-06-02T00:00:00.000Z",
    completedAt: "2026-06-02T00:00:01.000Z",
  };
}

describe("runtime-v4 ProjectPatch", () => {
  test("validates operations", () => {
    expect(projectPatchSchema.parse(patch)).toMatchObject({
      title: patch.title,
      operations: [
        { type: "update_creative_brief" },
        { type: "record_project_memory" },
      ],
    });
  });

  test("maps operation types to tool names", () => {
    expect(mapProjectPatchOperationToToolName({ type: "update_creative_brief", input: {} })).toBe("update_creative_brief");
    expect(mapProjectPatchOperationToToolName({
      type: "create_project_artifact",
      input: { type: "note", title: "Note", content: { ok: true } },
    })).toBe("create_project_artifact");
  });

  test("decision schema accepts project_patch decisions", () => {
    expect(agentDecisionSchema.parse({
      type: "project_patch",
      reason: "Save grouped workspace changes.",
      patch,
    })).toMatchObject({
      type: "project_patch",
      patch: {
        operations: expect.any(Array),
      },
    });
  });

  test("migration RLS policies qualify outer ownership columns", async () => {
    const sql = await readFile(
      join(process.cwd(), "supabase", "migrations", "20260602013000_add_agent_project_patches.sql"),
      "utf8",
    );

    expect(sql).toContain("card.id = agent_project_patches.project_id");
    expect(sql).toContain("card.owner_id = agent_project_patches.owner_id");
    expect(sql).toContain("patch.id = agent_project_patch_operations.patch_id");
    expect(sql).toContain("patch.owner_id = agent_project_patch_operations.owner_id");
    expect(sql).toContain("patch.project_id = agent_project_patch_operations.project_id");
    expect(sql).toContain("card.id = agent_project_patch_operations.project_id");
    expect(sql).toContain("card.owner_id = agent_project_patch_operations.owner_id");
    expect(sql).not.toMatch(/\bcard\.owner_id\s*=\s*owner_id\b/);
    expect(sql).not.toMatch(/\bpatch\.owner_id\s*=\s*owner_id\b/);
    expect(sql).not.toMatch(/\bpatch\.project_id\s*=\s*project_id\b/);
  });
});

describe("runtime-v4 patch executor", () => {
  test("reports completed when all operations succeed", async () => {
    const toolExecutor = {
      execute: vi.fn(async ({ toolName }) => completed(toolName)),
    };
    const executor = new PatchExecutor({ toolExecutor });

    const result = await executor.apply({ patch, context });

    expect(result).toMatchObject({
      status: "completed",
      successfulOperations: 2,
      failedOperations: 0,
      retryable: false,
    });
    expect(toolExecutor.execute).toHaveBeenCalledTimes(2);
    expect(result.events.map((event) => event.type)).toEqual([
      "patch_planned",
      "patch_applying",
      "patch_operation_running",
      "patch_operation_completed",
      "patch_operation_running",
      "patch_operation_completed",
      "patch_completed",
    ]);
  });

  test("reports partial_failed when one operation fails", async () => {
    const toolExecutor = {
      execute: vi.fn(async ({ toolName }) => toolName === "record_project_memory"
        ? {
            toolName,
            status: "failed" as const,
            error: {
              code: "MEMORY_FAILED",
              message: "Could not save memory.",
              recoverable: true,
            },
            startedAt: "2026-06-02T00:00:00.000Z",
            completedAt: "2026-06-02T00:00:01.000Z",
          }
        : completed(toolName)),
    };
    const executor = new PatchExecutor({ toolExecutor });

    const result = await executor.apply({ patch, context });

    expect(result).toMatchObject({
      status: "partial_failed",
      successfulOperations: 1,
      failedOperations: 1,
      retryable: true,
    });
    expect(result.operations[1]).toMatchObject({
      status: "failed",
      error: {
        code: "MEMORY_FAILED",
      },
    });
  });

  test("fails when verification fails", async () => {
    const toolExecutor = {
      execute: vi.fn(async ({ toolName }) => ({
        toolName,
        status: "failed" as const,
        error: {
          code: "TOOL_VERIFICATION_FAILED",
          message: "Verification failed.",
          recoverable: true,
        },
        verification: {
          verified: false,
          checkedAt: "2026-06-02T00:00:00.000Z",
        },
        startedAt: "2026-06-02T00:00:00.000Z",
        completedAt: "2026-06-02T00:00:01.000Z",
      })),
    };
    const executor = new PatchExecutor({ toolExecutor });

    const result = await executor.apply({
      patch: {
        ...patch,
        operations: [patch.operations[0]],
      },
      context,
    });

    expect(result).toMatchObject({
      status: "failed",
      failedOperations: 1,
      operations: [
        {
          status: "failed",
          verification: {
            verified: false,
          },
        },
      ],
    });
  });

  test("pauses before patch-level approval", async () => {
    const toolExecutor = {
      execute: vi.fn(async ({ toolName }) => completed(toolName)),
    };
    const executor = new PatchExecutor({ toolExecutor });

    const result = await executor.apply({
      patch: {
        ...patch,
        requiresApproval: true,
      },
      context,
    });

    expect(result).toMatchObject({
      status: "awaiting_approval",
      approvalRequired: true,
      successfulOperations: 0,
      failedOperations: 0,
      operations: [],
    });
    expect(toolExecutor.execute).not.toHaveBeenCalled();
    expect(result.events.map((event) => event.type)).toContain("patch_approval_required");
  });

  test("records patch-level approval through the best-effort audit store", async () => {
    const auditStore = {
      recordPatchStarted: vi.fn(),
      recordOperation: vi.fn(),
      recordPatchCompleted: vi.fn(),
    };
    const toolExecutor = {
      execute: vi.fn(async ({ toolName }) => completed(toolName)),
    };
    const executor = new PatchExecutor({ toolExecutor, auditStore });

    const result = await executor.apply({
      patch: {
        ...patch,
        requiresApproval: true,
      },
      context,
    });

    expect(result.status).toBe("awaiting_approval");
    expect(toolExecutor.execute).not.toHaveBeenCalled();
    expect(auditStore.recordPatchStarted).toHaveBeenCalledWith(expect.objectContaining({
      patch: expect.objectContaining({ title: patch.title }),
      context,
    }));
    expect(auditStore.recordOperation).not.toHaveBeenCalled();
    expect(auditStore.recordPatchCompleted).toHaveBeenCalledWith(expect.objectContaining({
      result: expect.objectContaining({
        status: "awaiting_approval",
        approvalRequired: true,
      }),
    }));
  });

  test("pauses before operation-level approval without executing the tool", async () => {
    const toolExecutor = {
      execute: vi.fn(async ({ toolName }) => completed(toolName)),
    };
    const executor = new PatchExecutor({ toolExecutor });

    const result = await executor.apply({
      patch: {
        ...patch,
        operations: [
          {
            ...patch.operations[0],
            requiresApproval: true,
          },
        ],
      },
      context,
    });

    expect(result).toMatchObject({
      status: "awaiting_approval",
      approvalRequired: true,
      successfulOperations: 0,
      failedOperations: 0,
      operations: [
        {
          type: "update_creative_brief",
          status: "awaiting_approval",
        },
      ],
    });
    expect(toolExecutor.execute).not.toHaveBeenCalled();
    expect(result.events.map((event) => event.type)).toEqual([
      "patch_planned",
      "patch_applying",
      "patch_operation_awaiting_approval",
      "patch_approval_required",
    ]);
  });

  test("records audit entries through the best-effort audit store", async () => {
    const auditStore = {
      recordPatchStarted: vi.fn(),
      recordOperation: vi.fn(),
      recordPatchCompleted: vi.fn(),
    };
    const toolExecutor = {
      execute: vi.fn(async ({ toolName }) => completed(toolName)),
    };
    const executor = new PatchExecutor({ toolExecutor, auditStore });

    const result = await executor.apply({
      patch: {
        ...patch,
        operations: [patch.operations[0]],
      },
      context,
    });

    expect(result.status).toBe("completed");
    expect(auditStore.recordPatchStarted).toHaveBeenCalledWith(expect.objectContaining({
      patch: expect.objectContaining({ title: patch.title }),
      context,
    }));
    expect(auditStore.recordOperation).toHaveBeenCalledWith(expect.objectContaining({
      operation: expect.objectContaining({
        type: "update_creative_brief",
        status: "completed",
      }),
    }));
    expect(auditStore.recordPatchCompleted).toHaveBeenCalledWith(expect.objectContaining({
      result: expect.objectContaining({
        status: "completed",
      }),
    }));
  });

  test("patch observations contribute operation outputs to run summaries", () => {
    const observation = projectPatchExecutionResultToObservation({
      status: "completed",
      patch,
      operations: [
        {
          operationIndex: 0,
          operation: {
            type: "update_script_lab",
            input: { hook: "SceneBook keeps the idea alive." },
          },
          type: "update_script_lab",
          toolName: "update_script_lab",
          input: { hook: "SceneBook keeps the idea alive." },
          status: "completed",
          retryable: false,
          message: "Script Lab updated.",
          output: {
            kind: "script_lab_update",
            changedFields: ["hook"],
            patch: { hook: "SceneBook keeps the idea alive." },
          },
        },
      ],
      summary: "Saved patch.",
      successfulOperations: 1,
      failedOperations: 0,
      retryable: false,
      events: [],
    });

    const summary = buildRunSummaryFromObservations({
      projectId: "project-1",
      threadId: "thread-1",
      runId: "run-1",
      userGoal: "Save the hook.",
      observations: [observation],
      finalResponse: "Saved patch.",
    });

    expect(summary?.workspaceChanges).toEqual([
      expect.objectContaining({
        toolName: "update_script_lab",
        kind: "script_lab_update",
        output: expect.objectContaining({
          patch: { hook: "SceneBook keeps the idea alive." },
        }),
      }),
    ]);
  });

  test("project memory patch outputs contribute durable workspace changes", () => {
    const observation = projectPatchExecutionResultToObservation({
      status: "completed",
      patch,
      operations: [
        {
          operationIndex: 0,
          operation: {
            type: "record_project_memory",
            input: {
              memoryType: "creative_direction",
              content: "Keep the devlog honest.",
            },
          },
          type: "record_project_memory",
          toolName: "record_project_memory",
          input: {
            memoryType: "creative_direction",
            content: "Keep the devlog honest.",
          },
          status: "completed",
          retryable: false,
          message: "Project memory recorded.",
          output: {
            kind: "project_memory",
            memoryId: "memory-1",
            memoryType: "creative_direction",
            content: "Keep the devlog honest.",
          },
        },
      ],
      summary: "Saved memory.",
      successfulOperations: 1,
      failedOperations: 0,
      retryable: false,
      events: [],
    });

    const summary = buildRunSummaryFromObservations({
      projectId: "project-1",
      threadId: "thread-1",
      runId: "run-1",
      userGoal: "Remember the devlog direction.",
      observations: [observation],
      finalResponse: "Saved memory.",
    });

    expect(summary?.workspaceChanges).toEqual([
      expect.objectContaining({
        toolName: "record_project_memory",
        kind: "project_memory",
        output: expect.objectContaining({
          memoryId: "memory-1",
          memoryType: "creative_direction",
        }),
      }),
    ]);
  });
});

describe("runtime-v4 graph execute-step integration", () => {
  test("calls tool executor for tool_call decisions", async () => {
    const toolExecutor = {
      execute: vi.fn(async ({ toolName }) => completed(toolName)),
    };
    const node = createExecuteStepNode({ toolExecutor });

    await node({
      projectId: "project-1",
      userId: "user-1",
      threadId: "thread-1",
      runId: "run-1",
      currentDecision: {
        type: "tool_call",
        toolName: "update_script_lab",
        input: { hook: "SceneBook keeps the idea alive." },
        reason: "The user asked to save the hook.",
      },
      errors: [],
      toolResults: [],
    } as never);

    expect(toolExecutor.execute).toHaveBeenCalledWith(expect.objectContaining({
      toolName: "update_script_lab",
      input: { hook: "SceneBook keeps the idea alive." },
      context: expect.objectContaining({
        userId: "user-1",
        projectId: "project-1",
        source: "agent",
      }),
    }));
  });

  test("emits verification events for direct tool_call decisions", async () => {
    const toolExecutor = {
      execute: vi.fn(async ({ toolName }) => ({
        ...completed(toolName),
        verification: {
          verified: true,
          checkedAt: "2026-06-02T00:00:00.000Z",
        },
      })),
    };
    const node = createExecuteStepNode({ toolExecutor });

    const update = await node({
      projectId: "project-1",
      userId: "user-1",
      threadId: "thread-1",
      runId: "run-1",
      currentDecision: {
        type: "tool_call",
        toolName: "update_script_lab",
        input: { hook: "SceneBook keeps the idea alive." },
        reason: "The user asked to save the hook.",
      },
      errors: [],
      toolResults: [],
    } as never);

    const events = update.events as Array<{ type: string }> | undefined;
    const toolResults = update.toolResults as Array<{ output?: Record<string, unknown> }> | undefined;

    expect(events?.map((event) => event.type)).toEqual(expect.arrayContaining([
      "tool_verification_completed",
      "tool_completed",
    ]));
    expect(toolResults?.[0]?.output).toMatchObject({
      verification: {
        verified: true,
      },
    });
  });

  test("calls patch executor for project_patch decisions", async () => {
    const patchExecutor = {
      apply: vi.fn(async () => ({
        status: "completed" as const,
        operations: [],
        summary: "Saved patch.",
        successfulOperations: 0,
        failedOperations: 0,
        retryable: false,
        events: [],
      })),
    };
    const node = createExecuteStepNode({ patchExecutor });

    await node({
      projectId: "project-1",
      userId: "user-1",
      threadId: "thread-1",
      runId: "run-1",
      currentDecision: {
        type: "project_patch",
        patch,
        reason: "The user asked to save grouped workspace state.",
      },
      errors: [],
      toolResults: [],
    } as never);

    expect(patchExecutor.apply).toHaveBeenCalledWith(expect.objectContaining({
      patch,
      context: expect.objectContaining({
        userId: "user-1",
        projectId: "project-1",
        source: "agent",
      }),
    }));
  });
});
