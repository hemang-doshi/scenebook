import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test, vi } from "vitest";

import type { ModelGateway } from "@/lib/ai/model-gateway";
import { createFakeModelGateway } from "@/lib/ai/model-gateway/providers/fake";
import {
  createSceneBookGraph,
  runSceneBookGraph,
} from "@/lib/agent/runtime-v4/graph/scenebook-graph";
import { createUnderstandIntentNode } from "@/lib/agent/runtime-v4/graph/nodes/understand-intent";
import type { ProjectMindStores } from "@/lib/agent/runtime-v4/memory/memory-types";

function queuedStructuredGateway(...responses: unknown[]): ModelGateway & { generateStructured: ReturnType<typeof vi.fn> } {
  const queue = [...responses];
  const generateStructured = vi.fn(async (request) => {
    if (request.profile === "structured_extraction") {
      return {
        object: request.schema.parse({
          intentType: "create_reel",
          confidence: 0.84,
          creativeMode: "plan",
          needsClarification: false,
          inferredGoal: "Help me make a reel about building SceneBook",
        }),
        finishReason: "stop",
      };
    }

    return {
      object: request.schema.parse(queue.shift() ?? responses.at(-1)),
      finishReason: "stop",
    };
  });

  return {
    provider: "fake",
    generateText: vi.fn(async () => ({ text: "Fake composed response.", finishReason: "stop" })),
    generateStructured,
    streamText: vi.fn(async () => ({
      textStream: (async function* stream() {
        yield "";
      })(),
    })),
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

  test("understand-intent graph node calls the structured extraction model profile", async () => {
    const gateway = queuedStructuredGateway({
      intentType: "create_reel",
      confidence: 0.88,
      creativeMode: "plan",
      needsClarification: false,
      inferredGoal: "Make a reel about building SceneBook",
    });
    const node = createUnderstandIntentNode({ modelGateway: gateway });

    const update = await node({
      goal: "Help me make a reel about building SceneBook",
      projectMind: {
        project: {
          title: "Building SceneBook in public",
          format: "reel",
        },
      },
      runId: "run-1",
      threadId: "thread-1",
    } as never);

    expect(gateway.generateStructured).toHaveBeenCalledWith(expect.objectContaining({
      profile: "structured_extraction",
      schemaName: "IntentUnderstanding",
    }));
    expect(update.currentIntent).toMatchObject({
      intentType: "create_reel",
      confidence: 0.84,
    });
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
    const gateway = queuedStructuredGateway({
      type: "final_response",
      response: "Here is the concise production answer.",
      confidence: 0.9,
    });

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
    const gateway = queuedStructuredGateway({
      type: "ask_question",
      questions: ["Who is the viewer for this reel?"],
      reason: "Audience is needed before planning.",
      expectedFieldTargets: ["audience"],
    });

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
    const gateway = queuedStructuredGateway(
      {
        type: "tool_call",
        toolName: "update_script_lab",
        input: { hook: "First hook" },
        reason: "Try a workspace update.",
      },
      {
        status: "continue",
        reason: "The goal is not satisfied yet.",
      },
      {
        type: "tool_call",
        toolName: "update_script_lab",
        input: { hook: "Second hook" },
        reason: "Try another workspace update.",
      },
      {
        status: "continue",
        reason: "Still not satisfied.",
      },
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
    const gateway = queuedStructuredGateway(
      {
        type: "tool_call",
        toolName: "update_script_lab",
        input: { hook: "Do not write this directly" },
        reason: "The model requested a workspace mutation.",
      },
      {
        status: "continue",
        reason: "The stubbed tool did not satisfy the goal.",
      },
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

  test("LangGraph runtime works end-to-end with the fake model provider", async () => {
    const gateway = createFakeModelGateway({
      structuredResponses: {
        structured_extraction: {
          intentType: "create_reel",
          confidence: 0.9,
          creativeMode: "plan",
          needsClarification: false,
          inferredGoal: "Make a reel about building SceneBook",
        },
        agent_decision: {
          type: "propose_plan",
          plan: {
            title: "Fake SceneBook launch reel plan",
            steps: [
              {
                label: "Frame the build-in-public hook.",
                sideEffect: "none",
              },
            ],
          },
          reason: "Fake gateway proposed a no-write plan.",
        },
      },
      textResponses: {
        final_response: "Fake final SceneBook response.",
      },
    });

    const state = await runSceneBookGraph({
      projectId: "project-1",
      userId: "user-1",
      runId: "run-1",
      goal: "Help me make a reel about building SceneBook",
      stores: projectMindStores(),
      modelGateway: gateway,
    });

    expect(state.plan?.title).toBe("Fake SceneBook launch reel plan");
    expect(state.finalResponse).toBe("Fake final SceneBook response.");
    expect(state.events.map((event) => event.type)).toEqual(expect.arrayContaining([
      "decision_made",
      "final_response",
      "run_completed",
    ]));
  });

  test("graph nodes do not import provider SDKs directly", async () => {
    const nodesDir = path.join(process.cwd(), "lib", "agent", "runtime-v4", "graph", "nodes");
    const filenames = await readdir(nodesDir);
    const nodeSources = await Promise.all(
      filenames
        .filter((filename) => filename.endsWith(".ts"))
        .map(async (filename) => readFile(path.join(nodesDir, filename), "utf8")),
    );

    expect(nodeSources.join("\n")).not.toMatch(/@ai-sdk\/google|@ai-sdk\/openai-compatible/);
  });

  test("graph nodes do not directly mutate database state", async () => {
    const nodesDir = path.join(process.cwd(), "lib", "agent", "runtime-v4", "graph", "nodes");
    const filenames = await readdir(nodesDir);
    const nodeSources = await Promise.all(
      filenames
        .filter((filename) => filename.endsWith(".ts"))
        .map(async (filename) => readFile(path.join(nodesDir, filename), "utf8")),
    );

    expect(nodeSources.join("\n")).not.toMatch(
      /createSupabaseServerClient|updateCard|upsertCreativeBrief|upsertActiveGoal|createScriptVersion|saveProjectMemory|createProjectArtifact/,
    );
  });
});
