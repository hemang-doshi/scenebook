import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const appendAgentMessage = vi.fn();
const completeAgentRun = vi.fn();
const createAgentRun = vi.fn();
const createOrLoadThread = vi.fn();
const failAgentRun = vi.fn();
const buildProjectContext = vi.fn();
const decideNextStep = vi.fn();
const checkGoalProgress = vi.fn();
const executeRuntimeV3Tool = vi.fn();
const summarizeRuntimeV3Tools = vi.fn();
const runWorkflow = vi.fn();
const createRuntimeV4ModelGateway = vi.fn();
const saveRunSummary = vi.fn();
const runSceneBookGraph = vi.fn();
const originalAgentOrchestrator = process.env.AGENT_ORCHESTRATOR;

function restoreAgentOrchestrator() {
  if (originalAgentOrchestrator === undefined) {
    delete process.env.AGENT_ORCHESTRATOR;
  } else {
    process.env.AGENT_ORCHESTRATOR = originalAgentOrchestrator;
  }
}

vi.mock("@/lib/agent/runtime", () => ({
  appendAgentMessage,
  completeAgentRun,
  createAgentRun,
  createOrLoadThread,
  failAgentRun,
}));

vi.mock("@/lib/agent/runtime-v4/context/context-builder", () => ({
  buildProjectContext,
}));

vi.mock("@/lib/agent/runtime-v4/decision/decision-engine", () => ({
  decideNextStep,
}));

vi.mock("@/lib/agent/runtime-v4/decision/goal-checker", () => ({
  checkGoalProgress,
}));

vi.mock("@/lib/agent/runtime-v3/tools/executor", () => ({
  executeRuntimeV3Tool,
}));

vi.mock("@/lib/agent/runtime-v3/tools/registry", () => ({
  summarizeRuntimeV3Tools,
}));

vi.mock("@/lib/agent/runtime-v3/workflows", () => ({
  runWorkflow,
}));

vi.mock("@/lib/agent/runtime-v4/model", () => ({
  createRuntimeV4ModelGateway,
}));

vi.mock("@/lib/agent/runtime-v4/graph/scenebook-graph", () => ({
  runSceneBookGraph,
}));

vi.mock("@/lib/agent/runtime-v4/memory/run-summary-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/agent/runtime-v4/memory/run-summary-store")>();
  return {
    ...actual,
    saveRunSummary,
  };
});

function snapshot() {
  return {
    project: {
      id: "project-1",
      ownerId: "user-1",
      title: "Bronze watch hero reel",
      platform: "instagram",
      format: "reel",
      status: "idea",
      topicTags: [],
      experimentTags: [],
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    },
    creativeBrief: null,
    activeGoal: null,
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
    scriptVersions: [],
    shootPack: {
      aRoll: [],
      bRoll: [],
      screenCaptures: [],
      props: [],
      missingAssets: [],
      locationNotes: "",
      visualNotes: "",
    },
    assets: {
      count: 0,
      folders: [],
      looseAssetCount: 0,
      recent: [],
    },
    assetLibrary: {
      count: 0,
      folders: [],
      looseAssetCount: 0,
      recent: [],
    },
    selectedOutputs: [],
    rejectedOutputs: [],
    durableProjectMemories: [],
    recentRunSummaries: [],
    integrationState: {
      available: false,
      connections: [],
      note: "External integrations are not wired in Agent v4 yet.",
    },
    editor: {
      ready: false,
      integrationAvailable: false,
      note: "Editor handoff artifacts are available; timeline writes are not wired yet.",
    },
    publish: {
      ready: false,
      integrationAvailable: false,
      caption: null,
    },
    analytics: null,
    conversation: {
      recentMessages: [],
    },
    toolHistory: [],
    memory: [],
    readiness: {
      briefCompleteness: 0,
      scriptCompleteness: 0,
      assetReadiness: 0,
      shootReadiness: 0,
      editorReadiness: 0,
      publishReadiness: 0,
      nextLikelyStage: "ideating",
      missing: ["creative brief", "script"],
    },
  };
}

describe("runtime-v4 run summaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreAgentOrchestrator();
    createOrLoadThread.mockResolvedValue({ id: "thread-1" });
    createAgentRun.mockResolvedValue({ id: "run-1" });
    appendAgentMessage.mockResolvedValue({});
    completeAgentRun.mockResolvedValue(undefined);
    failAgentRun.mockResolvedValue(undefined);
    summarizeRuntimeV3Tools.mockReturnValue([]);
    createRuntimeV4ModelGateway.mockReturnValue({});
    buildProjectContext.mockResolvedValue({
      snapshot: snapshot(),
      projectMind: snapshot(),
      compactContext: { project: { id: "project-1", title: "Bronze watch hero reel" } },
    });
    decideNextStep.mockResolvedValue({
      type: "tool_call",
      toolName: "update_script_lab",
      input: { hook: "The clasp tells you everything." },
      reason: "The user asked to save a hook.",
    });
    executeRuntimeV3Tool.mockResolvedValue({
      toolName: "update_script_lab",
      toolCallId: "tool-1",
      status: "completed",
      message: "Script Lab updated.",
      output: {
        kind: "script_lab_update",
        changedFields: ["hook"],
        patch: { hook: "The clasp tells you everything." },
      },
    });
    checkGoalProgress.mockResolvedValue({
      status: "satisfied",
      response: "Hook changed and verified in Script Lab.",
      reason: "The requested hook was saved.",
    });
    saveRunSummary.mockResolvedValue({
      id: "summary-1",
      ownerId: "user-1",
      projectId: "project-1",
      threadId: "thread-1",
      runId: "run-1",
      userGoal: "hook: The clasp tells you everything.",
      summary: "Hook changed and verified in Script Lab.",
      actionsTaken: [],
      workspaceChanges: [],
      selectedOutputs: [],
      rejectedOutputs: [],
      openNextSteps: [],
      metadata: {},
    });
    runSceneBookGraph.mockResolvedValue({
      projectId: "project-1",
      userId: "user-1",
      threadId: "thread-1",
      runId: "run-1",
      goal: "Help me make a reel about building SceneBook.",
      messages: [
        { role: "user", content: "Help me make a reel about building SceneBook." },
        { role: "assistant", content: "Plan a reel about building SceneBook" },
      ],
      observations: [],
      toolResults: [],
      events: [
        {
          type: "decision_made",
          runId: "run-1",
          decision: {
            type: "propose_plan",
            plan: {
              title: "Plan a reel about building SceneBook",
              steps: [],
            },
            reason: "Creative planning request.",
          },
        },
        {
          type: "final_response",
          runId: "run-1",
          response: "Plan a reel about building SceneBook",
        },
        {
          type: "run_completed",
          runId: "run-1",
          threadId: "thread-1",
          waitingForUser: false,
        },
      ],
      finalResponse: "Plan a reel about building SceneBook",
      stopReason: "goal_satisfied",
      errors: [],
      stepCount: 1,
    });
  });

  afterEach(() => {
    restoreAgentOrchestrator();
  });

  test("custom runtime still works when AGENT_ORCHESTRATOR=custom", async () => {
    process.env.AGENT_ORCHESTRATOR = "custom";
    const { AgentKernel } = await import("@/lib/agent/runtime-v4/kernel");
    const response = AgentKernel.run({
      projectId: "project-1",
      threadId: "thread-1",
      userId: "user-1",
      message: "hook: The clasp tells you everything.",
      selectedModels: {},
    });

    await response.text();

    expect(buildProjectContext).toHaveBeenCalled();
    expect(decideNextStep).toHaveBeenCalled();
    expect(runSceneBookGraph).not.toHaveBeenCalled();
    expect(saveRunSummary).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      threadId: "thread-1",
      runId: "run-1",
      userGoal: "hook: The clasp tells you everything.",
      actionsTaken: ["update_script_lab: Script Lab updated."],
      workspaceChanges: [
        expect.objectContaining({
          kind: "script_lab_update",
          toolName: "update_script_lab",
        }),
      ],
    }));
    expect(completeAgentRun).toHaveBeenCalledWith("run-1", expect.objectContaining({
      runtime: "v4",
      runSummaryId: "summary-1",
      runSummarySaved: true,
    }));
  });

  test("langgraph runtime persists a run and delegates orchestration to SceneBookGraph", async () => {
    process.env.AGENT_ORCHESTRATOR = "langgraph";
    const { AgentKernel } = await import("@/lib/agent/runtime-v4/kernel");
    const response = AgentKernel.run({
      projectId: "project-1",
      threadId: "thread-1",
      userId: "user-1",
      message: "Help me make a reel about building SceneBook.",
      selectedModels: {},
    });

    const text = await response.text();

    expect(createOrLoadThread).toHaveBeenCalledWith("project-1", "thread-1");
    expect(createAgentRun).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      threadId: "thread-1",
      input: "Help me make a reel about building SceneBook.",
      metadata: expect.objectContaining({
        runtime: "v4",
        orchestrator: "langgraph",
      }),
    }));
    expect(runSceneBookGraph).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      threadId: "thread-1",
      userId: "user-1",
      runId: "run-1",
      goal: "Help me make a reel about building SceneBook.",
    }));
    expect(appendAgentMessage).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      threadId: "thread-1",
      role: "assistant",
      content: "Plan a reel about building SceneBook",
      provider: "agent-runtime-v4",
    }));
    expect(completeAgentRun).toHaveBeenCalledWith("run-1", expect.objectContaining({
      runtime: "v4",
      orchestrator: "langgraph",
      graphStopReason: "goal_satisfied",
      graphStepCount: 1,
    }));
    expect(text).toContain("Plan a reel about building SceneBook");
  });
});
