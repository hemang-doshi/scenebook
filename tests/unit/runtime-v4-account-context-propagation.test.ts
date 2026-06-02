import { describe, expect, test, vi } from "vitest";

import { createExecuteStepNode } from "@/lib/agent/runtime-v4/graph/nodes/execute-step";
import { runSceneBookGraph } from "@/lib/agent/runtime-v4/graph/scenebook-graph";
import type { ProjectMindStores } from "@/lib/agent/runtime-v4/memory/memory-types";
import type { AccountContext } from "@/lib/auth/account-context";

const account: AccountContext = {
  userId: "user-1",
  projectId: "project-1",
  workspaceId: null,
  role: "owner",
  permissions: {
    canReadProject: true,
    canWriteProject: true,
    canApplyPatch: true,
    canManageIntegrations: true,
  },
};

function projectMindStores(): ProjectMindStores {
  return {
    getProjectWorkspace: vi.fn(async () => ({
      id: "project-1",
      ownerId: "user-1",
      title: "SceneBook account propagation",
      status: "idea" as const,
      format: "reel" as const,
      platform: "instagram" as const,
      topicTags: [],
      experimentTags: [],
      scriptLab: {
        angle: "",
        hook: "",
        outline: "",
        script: "",
        caption: "",
        onScreenText: "",
        cta: "",
        notes: "",
      },
      shootPack: {
        aRoll: [],
        bRoll: [],
        screenCaptures: [],
        props: [],
        missingAssets: [],
        locationNotes: "",
        visualNotes: "",
      },
      analyticsJournal: null,
      assets: [],
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    })),
    getAgentHistory: vi.fn(async () => ({
      thread: null,
      messages: [],
      toolCalls: [],
    })),
    getProjectAssetLibrary: vi.fn(async () => ({
      folders: [],
      looseAssets: [],
    })),
    loadCreativeBrief: vi.fn(async () => null),
    loadActiveGoal: vi.fn(async () => null),
    listScriptVersions: vi.fn(async () => []),
    listProjectMemories: vi.fn(async () => []),
    listRecentRunSummaries: vi.fn(async () => []),
  };
}

describe("runtime-v4 account context propagation", () => {
  test("runtime-v4 graph state carries account context", async () => {
    const state = await runSceneBookGraph({
      projectId: "project-1",
      userId: "user-1",
      goal: "Give me a no-write plan",
      stores: projectMindStores(),
      account,
      permissions: account.permissions,
    });

    expect(state.account).toEqual(account);
    expect(state.permissions).toEqual(account.permissions);
  });

  test("tool execution context receives account permissions", async () => {
    const toolExecutor = {
      execute: vi.fn(async ({ toolName }) => ({
        toolName,
        status: "completed" as const,
        output: { ok: true },
        startedAt: "2026-06-02T00:00:00.000Z",
        completedAt: "2026-06-02T00:00:01.000Z",
      })),
    };
    const node = createExecuteStepNode({ toolExecutor });

    await node({
      projectId: "project-1",
      userId: "user-1",
      account,
      permissions: account.permissions,
      currentDecision: {
        type: "tool_call",
        toolName: "update_script_lab",
        input: { hook: "SceneBook keeps the account context." },
        reason: "The user asked to save the hook.",
      },
      errors: [],
      toolResults: [],
    } as never);

    expect(toolExecutor.execute).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({
        account,
        permissions: account.permissions,
      }),
    }));
  });
});
