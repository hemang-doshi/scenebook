import { describe, expect, test, vi } from "vitest";

import {
  createSceneBookGraph,
  runSceneBookGraph,
} from "@/lib/agent/runtime-v4/graph/scenebook-graph";
import type { ProjectMindStores } from "@/lib/agent/runtime-v4/memory/memory-types";

function projectMindStores(): ProjectMindStores {
  return {
    getProjectWorkspace: vi.fn(async () => ({
      id: "project-1",
      ownerId: "user-1",
      title: "Building SceneBook in public",
      status: "idea" as const,
      format: "reel" as const,
      platform: "instagram" as const,
      topicTags: ["build-in-public", "product"],
      experimentTags: ["founder-story"],
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
      thread: { id: "thread-1" },
      messages: [{ role: "user", content: "Help me make a reel", created_at: "2026-06-01T00:00:00.000Z" }],
      toolCalls: [],
    })),
    getProjectAssetLibrary: vi.fn(async () => ({
      folders: [],
      looseAssets: [],
    })),
    loadCreativeBrief: vi.fn(async () => ({
      audience: "indie builders",
      platform: "instagram",
      format: "reel",
      tone: "clear and practical",
      coreAngle: "Show how SceneBook is being built from real creator workflow needs.",
      viewerPromise: "Understand the product thinking behind SceneBook.",
      visualStyle: "screen recordings with founder narration",
      cta: "Follow for the build log.",
      openQuestions: [],
    })),
    loadActiveGoal: vi.fn(async () => null),
    listScriptVersions: vi.fn(async () => []),
    listProjectMemories: vi.fn(async () => [
      {
        id: "memory-1",
        ownerId: "user-1",
        projectId: "project-1",
        threadId: "thread-1",
        runId: null,
        toolCallId: null,
        memoryType: "creative_direction" as const,
        summary: "Keep the story concrete and show actual SceneBook UI building moments.",
        content: {},
        source: "agent" as const,
        confidence: 0.9,
        userApproved: true,
        supersedesMemoryId: null,
        status: "active" as const,
        createdAt: "2026-06-01T00:05:00.000Z",
        updatedAt: "2026-06-01T00:05:00.000Z",
      },
    ]),
    listRecentRunSummaries: vi.fn(async () => []),
  };
}

describe("runtime-v4 LangGraph spike", () => {
  test("graph initializes", () => {
    const graph = createSceneBookGraph({
      stores: projectMindStores(),
    });

    expect(graph).toBeDefined();
  });

  test("loads a mocked ProjectMind snapshot and keeps required state", async () => {
    const stores = projectMindStores();
    const state = await runSceneBookGraph({
      projectId: "project-1",
      userId: "user-1",
      threadId: "thread-1",
      goal: "Help me make a reel about building SceneBook",
      stores,
    });

    expect(stores.getProjectWorkspace).toHaveBeenCalledWith("project-1");
    expect(state.projectMind?.project).toMatchObject({
      id: "project-1",
      ownerId: "user-1",
      title: "Building SceneBook in public",
    });
    expect(state.projectId).toBe("project-1");
    expect(state.userId).toBe("user-1");
    expect(state.goal).toBe("Help me make a reel about building SceneBook");
    expect(state.messages).toEqual([
      expect.objectContaining({ role: "user", content: "Help me make a reel about building SceneBook" }),
      expect.objectContaining({ role: "assistant" }),
    ]);
    expect(state.observations.map((observation) => observation.type)).toEqual([
      "project_mind_loaded",
      "intent_understood",
      "plan_proposed",
      "final_response",
    ]);
  });

  test("produces a plan for a SceneBook reel request", async () => {
    const state = await runSceneBookGraph({
      projectId: "project-1",
      userId: "user-1",
      goal: "Help me make a reel about building SceneBook",
      stores: projectMindStores(),
    });

    expect(state.plan?.title).toBe("Plan a reel about building SceneBook");
    expect(state.plan?.steps.map((step) => step.label).join(" ")).toContain("building SceneBook");
    expect(state.plan?.steps.every((step) => step.sideEffect === "none")).toBe(true);
    expect(state.finalResponse).toContain("Plan a reel about building SceneBook");
  });
});
