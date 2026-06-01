import { describe, expect, test, vi } from "vitest";

import type { ModelGateway } from "@/lib/ai/model-gateway";
import {
  createSceneBookGraph,
  runSceneBookGraph,
} from "@/lib/agent/runtime-v4/graph/scenebook-graph";
import type { ProjectMindStores } from "@/lib/agent/runtime-v4/memory/memory-types";

function queuedTextGateway(...responses: string[]): ModelGateway & { generateText: ReturnType<typeof vi.fn> } {
  const queue = [...responses];
  const generateText = vi.fn(async () => queue.shift() ?? responses.at(-1) ?? "");

  return {
    provider: "fake",
    generateText,
    async generateStructured() {
      throw new Error("Graph tests use raw structured text parsing.");
    },
    async *streamText() {
      yield "";
    },
  };
}

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

describe("runtime-v4 LangGraph runtime", () => {
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
    expect(state.observations.map((observation) => observation.type)).toEqual(expect.arrayContaining([
      "project_mind_loaded",
      "intent_understood",
      "decision_made",
      "final_response",
    ]));
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
    expect(state.stopReason).toBe("goal_satisfied");
  });

  test("stops when a final response is produced", async () => {
    const gateway = queuedTextGateway(JSON.stringify({
      type: "final_response",
      response: "Here is the concise production answer.",
      confidence: 0.9,
    }));

    const state = await runSceneBookGraph({
      projectId: "project-1",
      userId: "user-1",
      runId: "run-1",
      goal: "Give me a quick take",
      stores: projectMindStores(),
      modelGateway: gateway,
    });

    expect(state.finalResponse).toBe("Here is the concise production answer.");
    expect(state.stopReason).toBe("final_response");
    expect(state.stepCount).toBe(1);
    expect(state.events.map((event) => event.type)).toEqual(expect.arrayContaining([
      "decision_made",
      "final_response",
      "run_completed",
    ]));
  });

  test("stops when the next step is a clarifying question", async () => {
    const gateway = queuedTextGateway(JSON.stringify({
      type: "ask_question",
      questions: ["Who is the viewer for this reel?"],
      reason: "Audience is needed before planning.",
      expectedFieldTargets: ["audience"],
    }));

    const state = await runSceneBookGraph({
      projectId: "project-1",
      userId: "user-1",
      runId: "run-1",
      goal: "Make this stronger",
      stores: projectMindStores(),
      modelGateway: gateway,
    });

    expect(state.askQuestion?.questions).toEqual(["Who is the viewer for this reel?"]);
    expect(state.finalResponse).toContain("Who is the viewer for this reel?");
    expect(state.stopReason).toBe("ask_question");
  });

  test("stops when max steps are reached", async () => {
    const gateway = queuedTextGateway(
      JSON.stringify({
        type: "tool_call",
        toolName: "update_script_lab",
        input: { hook: "First hook" },
        reason: "Try a workspace update.",
      }),
      JSON.stringify({
        status: "continue",
        reason: "The goal is not satisfied yet.",
      }),
      JSON.stringify({
        type: "tool_call",
        toolName: "update_script_lab",
        input: { hook: "Second hook" },
        reason: "Try another workspace update.",
      }),
      JSON.stringify({
        status: "continue",
        reason: "Still not satisfied.",
      }),
    );

    const state = await runSceneBookGraph({
      projectId: "project-1",
      userId: "user-1",
      runId: "run-1",
      goal: "Keep updating until done",
      stores: projectMindStores(),
      modelGateway: gateway,
      maxSteps: 2,
    });

    expect(state.stepCount).toBe(2);
    expect(state.stopReason).toBe("max_steps");
    expect(state.errors.join(" ")).toMatch(/step limit/i);
    expect(state.finalResponse).toMatch(/step limit/i);
  });

  test("does not execute mutating decisions without a graph executor", async () => {
    const gateway = queuedTextGateway(
      JSON.stringify({
        type: "tool_call",
        toolName: "update_script_lab",
        input: { hook: "Do not write this directly" },
        reason: "The model requested a workspace mutation.",
      }),
      JSON.stringify({
        status: "continue",
        reason: "The stubbed tool did not satisfy the goal.",
      }),
    );

    const state = await runSceneBookGraph({
      projectId: "project-1",
      userId: "user-1",
      runId: "run-1",
      goal: "Save this hook",
      stores: projectMindStores(),
      modelGateway: gateway,
      maxSteps: 1,
    });

    expect(state.toolResults).toEqual([
      expect.objectContaining({
        toolName: "update_script_lab",
        status: "blocked",
        message: expect.stringMatching(/no runtime-v4 tool executor/i),
      }),
    ]);
    expect(state.events.map((event) => event.type)).toContain("tool_failed");
  });
});
