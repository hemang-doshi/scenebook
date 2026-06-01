import { z } from "zod";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { createRuntimeV4ToolRegistry, getRuntimeV4Tool, listRuntimeV4Tools, ToolRegistry } from "@/lib/agent/runtime-v4/tools/registry";
import { ToolExecutor } from "@/lib/agent/runtime-v4/tools/executor";
import type { AgentTool, ToolExecutionContext } from "@/lib/agent/runtime-v4/tools/types";

const context: ToolExecutionContext = {
  userId: "user-1",
  projectId: "project-1",
  threadId: "thread-1",
  runId: "run-1",
  source: "test",
};

const outputSchema = z.object({
  ok: z.boolean(),
});

function testTool(overrides: Partial<AgentTool<{ title: string }, { ok: boolean }>> = {}): AgentTool<{ title: string }, { ok: boolean }> {
  return {
    name: "test_tool",
    displayName: "Test Tool",
    description: "A test-only runtime-v4 tool.",
    inputSchema: z.object({ title: z.string().min(1) }),
    outputSchema,
    riskLevel: "low",
    sideEffect: "none",
    approvalPolicy: "never",
    availability: "available",
    handler: vi.fn(async () => ({ ok: true })),
    ...overrides,
  };
}

describe("runtime-v4 tool registry", () => {
  test("contains exactly the core workspace tools with required metadata", () => {
    const tools = listRuntimeV4Tools();

    expect(tools.map((tool) => tool.name)).toEqual([
      "update_creative_brief",
      "update_active_goal",
      "create_script_version",
      "update_script_lab",
      "update_shoot_pack",
      "create_project_artifact",
      "record_project_memory",
    ]);
    expect(tools).toHaveLength(7);
    for (const tool of tools) {
      expect(tool).toMatchObject({
        riskLevel: "low",
        sideEffect: "workspace",
        approvalPolicy: "never",
        availability: "available",
      });
      expect(tool.inputSchema).toBeDefined();
      expect(tool.outputSchema).toBeDefined();
      expect(tool.handler).toEqual(expect.any(Function));
      expect(tool.verify).toEqual(expect.any(Function));
    }
    expect(getRuntimeV4Tool("update_creative_brief")?.sideEffect).toBe("workspace");
  });

  test("can create an isolated registry for executor tests", () => {
    const registry = createRuntimeV4ToolRegistry([testTool()]);

    expect(registry.get("test_tool")?.displayName).toBe("Test Tool");
    expect(registry.list()).toHaveLength(1);
  });
});

describe("runtime-v4 tool executor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("validates input with Zod", async () => {
    const executor = new ToolExecutor({
      registry: new ToolRegistry([testTool()]),
    });

    const result = await executor.execute({
      toolName: "test_tool",
      input: {},
      context,
    });

    expect(result).toMatchObject({
      toolName: "test_tool",
      status: "failed",
      error: {
        code: "TOOL_INPUT_INVALID",
        recoverable: true,
      },
    });
  });

  test("rejects unknown tools", async () => {
    const executor = new ToolExecutor({
      registry: new ToolRegistry([]),
    });

    const result = await executor.execute({
      toolName: "missing_tool",
      input: {},
      context,
    });

    expect(result).toMatchObject({
      toolName: "missing_tool",
      status: "blocked",
      error: {
        code: "TOOL_NOT_FOUND",
        recoverable: false,
      },
    });
  });

  test("blocks unavailable tools without calling the handler", async () => {
    const handler = vi.fn(async () => ({ ok: true }));
    const executor = new ToolExecutor({
      registry: new ToolRegistry([
        testTool({
          availability: "requires_integration",
          handler,
        }),
      ]),
    });

    const result = await executor.execute({
      toolName: "test_tool",
      input: { title: "Run" },
      context,
    });

    expect(result).toMatchObject({
      status: "blocked",
      error: {
        code: "TOOL_UNAVAILABLE",
      },
    });
    expect(handler).not.toHaveBeenCalled();
  });

  test("fails when verification fails", async () => {
    const executor = new ToolExecutor({
      registry: new ToolRegistry([
        testTool({
          sideEffect: "workspace",
          verify: vi.fn(async () => ({
            verified: false,
            checkedAt: "2026-06-02T00:00:00.000Z",
            reason: "Persisted state did not match.",
          })),
        }),
      ]),
      policyEngine: {
        check: vi.fn(async () => ({ status: "allowed" })),
      },
    });

    const result = await executor.execute({
      toolName: "test_tool",
      input: { title: "Run" },
      context,
    });

    expect(result).toMatchObject({
      status: "failed",
      error: {
        code: "TOOL_VERIFICATION_FAILED",
        recoverable: true,
      },
      verification: {
        verified: false,
      },
    });
  });

  test("propagates context toolCallId across result statuses", async () => {
    const executionContext = { ...context, toolCallId: "tool-call-1" };
    const allowedPolicy = {
      check: vi.fn(async () => ({ status: "allowed" })),
    };

    await expect(new ToolExecutor({
      registry: new ToolRegistry([testTool()]),
      policyEngine: allowedPolicy,
    }).execute({
      toolName: "test_tool",
      input: { title: "Run" },
      context: executionContext,
    })).resolves.toMatchObject({
      status: "completed",
      toolCallId: "tool-call-1",
    });

    await expect(new ToolExecutor({
      registry: new ToolRegistry([testTool()]),
      policyEngine: allowedPolicy,
    }).execute({
      toolName: "test_tool",
      input: {},
      context: executionContext,
    })).resolves.toMatchObject({
      status: "failed",
      toolCallId: "tool-call-1",
    });

    await expect(new ToolExecutor({
      registry: new ToolRegistry([]),
    }).execute({
      toolName: "missing_tool",
      input: {},
      context: executionContext,
    })).resolves.toMatchObject({
      status: "blocked",
      toolCallId: "tool-call-1",
    });

    await expect(new ToolExecutor({
      registry: new ToolRegistry([
        testTool({ availability: "requires_integration" }),
      ]),
    }).execute({
      toolName: "test_tool",
      input: { title: "Run" },
      context: executionContext,
    })).resolves.toMatchObject({
      status: "blocked",
      toolCallId: "tool-call-1",
    });

    await expect(new ToolExecutor({
      registry: new ToolRegistry([testTool()]),
      policyEngine: {
        check: vi.fn(async () => ({
          status: "requires_approval",
          approvalType: "external_write",
          reason: "External write requires approval.",
          recoverable: true,
        })),
      },
    }).execute({
      toolName: "test_tool",
      input: { title: "Run" },
      context: executionContext,
    })).resolves.toMatchObject({
      status: "awaiting_approval",
      toolCallId: "tool-call-1",
    });
  });

  test("classifies verifier exceptions as verification failures with parsed output", async () => {
    const executor = new ToolExecutor({
      registry: new ToolRegistry([
        testTool({
          verify: vi.fn(async () => {
            throw new Error("Verifier exploded.");
          }),
        }),
      ]),
      policyEngine: {
        check: vi.fn(async () => ({ status: "allowed" })),
      },
    });

    const result = await executor.execute({
      toolName: "test_tool",
      input: { title: "Run" },
      context,
    });

    expect(result).toMatchObject({
      status: "failed",
      output: { ok: true },
      error: {
        code: "TOOL_VERIFICATION_FAILED",
        message: "Verifier exploded.",
        recoverable: true,
      },
      verification: {
        verified: false,
        reason: "Verifier exploded.",
      },
    });
  });
});
