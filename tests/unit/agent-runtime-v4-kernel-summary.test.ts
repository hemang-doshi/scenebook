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
const summarizeRuntimeV4Tools = vi.fn();
const createRuntimeV4ToolRegistry = vi.fn();
const runWorkflow = vi.fn();
const createRuntimeV4ModelGateway = vi.fn();
const saveRunSummary = vi.fn();
const runSceneBookGraph = vi.fn();
const toolExecutorExecute = vi.fn();
const ToolExecutor = vi.fn(function ToolExecutor() {
  return { execute: toolExecutorExecute };
});
const patchExecutorApply = vi.fn();
const SupabasePatchAuditStore = vi.fn(function SupabasePatchAuditStore() {
  return { source: "supabase-patch-audit" };
});
const PatchExecutor = vi.fn(function PatchExecutor() {
  return { apply: patchExecutorApply };
});
const workflowExecutorExecute = vi.fn();
const WorkflowExecutor = vi.fn(function WorkflowExecutor() {
  return { execute: workflowExecutorExecute };
});
const originalAgentOrchestrator = process.env.AGENT_ORCHESTRATOR;

function restoreAgentOrchestrator() {
  if (originalAgentOrchestrator === undefined) {
    delete process.env.AGENT_ORCHESTRATOR;
  } else {
    process.env.AGENT_ORCHESTRATOR = originalAgentOrchestrator;
  }
}

function parseSsePackets(text: string) {
  return text
    .split("\n\n")
    .filter((chunk) => chunk.startsWith("data: "))
    .map((chunk) => JSON.parse(chunk.slice("data: ".length)));
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

vi.mock("@/lib/agent/runtime-v4/tools/registry", () => ({
  createRuntimeV4ToolRegistry,
  summarizeRuntimeV4Tools,
}));

vi.mock("@/lib/agent/runtime-v4/tools/executor", () => ({
  ToolExecutor,
}));

vi.mock("@/lib/agent/runtime-v4/patch/patch-executor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/agent/runtime-v4/patch/patch-executor")>();
  return {
    ...actual,
    PatchExecutor,
    SupabasePatchAuditStore,
  };
});

vi.mock("@/lib/agent/runtime-v4/workflows/workflow-executor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/agent/runtime-v4/workflows/workflow-executor")>();
  return {
    ...actual,
    WorkflowExecutor,
  };
});

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
    summarizeRuntimeV4Tools.mockReturnValue([{ name: "update_script_lab" }]);
    createRuntimeV4ToolRegistry.mockReturnValue({ id: "runtime-v4-registry" });
    toolExecutorExecute.mockResolvedValue({
      toolName: "update_script_lab",
      status: "completed",
      message: "Script Lab updated.",
      output: {
        kind: "script_lab_update",
        changedFields: ["hook"],
        patch: { hook: "The clasp tells you everything." },
      },
      startedAt: "2026-06-02T00:00:00.000Z",
      completedAt: "2026-06-02T00:00:01.000Z",
    });
    patchExecutorApply.mockResolvedValue({
      status: "completed",
      patch: {
        title: "Save patch",
        summary: "Save patch.",
        riskLevel: "low",
        requiresApproval: false,
        operations: [],
      },
      operations: [],
      summary: "Saved patch.",
      successfulOperations: 0,
      failedOperations: 0,
      retryable: false,
      events: [],
    });
    workflowExecutorExecute.mockResolvedValue({
      workflowResult: {
        status: "completed",
        workflowName: "create_full_production_package",
        response: "Package planned.",
        artifacts: [],
      },
      observation: {
        toolName: "create_full_production_package",
        status: "completed",
        message: "Package planned.",
        output: {
          kind: "creative_workflow",
          workflowName: "create_full_production_package",
          patchAutoApplySkipped: true,
          patchId: "patch-1",
        },
      },
      events: [
        {
          type: "workflow_completed",
          runId: "run-1",
          threadId: "thread-1",
          workflowName: "create_full_production_package",
          message: "Package planned.",
        },
      ],
    });
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
    expect(toolExecutorExecute).toHaveBeenCalledWith(expect.objectContaining({
      toolName: "update_script_lab",
      input: { hook: "The clasp tells you everything." },
      context: expect.objectContaining({
        userId: "user-1",
        projectId: "project-1",
        threadId: "thread-1",
        runId: "run-1",
        source: "agent",
      }),
    }));
    expect(executeRuntimeV3Tool).not.toHaveBeenCalled();
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
      toolSummaries: [{ name: "update_script_lab" }],
      toolExecutor: expect.objectContaining({
        execute: toolExecutorExecute,
      }),
      patchExecutor: expect.objectContaining({
        apply: patchExecutorApply,
      }),
    }));
    expect(PatchExecutor).toHaveBeenCalledWith(expect.objectContaining({
      auditStore: expect.objectContaining({
        source: "supabase-patch-audit",
      }),
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

  test("langgraph runtime streams legacy packets and raw runtime-v4 events", async () => {
    process.env.AGENT_ORCHESTRATOR = "langgraph";
    const { AgentKernel } = await import("@/lib/agent/runtime-v4/kernel");
    const response = AgentKernel.run({
      projectId: "project-1",
      threadId: "thread-1",
      userId: "user-1",
      message: "Help me make a reel about building SceneBook.",
      selectedModels: {},
    });

    const packets = parseSsePackets(await response.text());

    expect(packets).toContainEqual(expect.objectContaining({
      type: "decision",
      decision: expect.objectContaining({
        type: "propose_plan",
      }),
    }));
    expect(packets).toContainEqual(expect.objectContaining({
      type: "v4_event",
      event: expect.objectContaining({
        type: "decision_made",
        runId: "run-1",
        decision: expect.objectContaining({
          type: "propose_plan",
        }),
      }),
    }));
    expect(packets).toContainEqual(expect.objectContaining({
      type: "message_delta",
      text: "Plan a reel about building SceneBook",
    }));
    expect(packets).toContainEqual(expect.objectContaining({
      type: "v4_event",
      event: expect.objectContaining({
        type: "final_response",
        response: "Plan a reel about building SceneBook",
      }),
    }));
  });

  test("custom runtime executes project_patch decisions through PatchExecutor", async () => {
    process.env.AGENT_ORCHESTRATOR = "custom";
    decideNextStep.mockResolvedValue({
      type: "project_patch",
      reason: "Save grouped workspace state.",
      patch: {
        title: "Save SceneBook launch direction",
        summary: "Save launch reel direction.",
        riskLevel: "low",
        requiresApproval: false,
        operations: [
          {
            type: "update_script_lab",
            input: { hook: "SceneBook keeps the idea alive." },
          },
        ],
      },
    });

    const { AgentKernel } = await import("@/lib/agent/runtime-v4/kernel");
    const response = AgentKernel.run({
      projectId: "project-1",
      threadId: "thread-1",
      userId: "user-1",
      message: "Save this hook.",
      selectedModels: {},
    });

    await response.text();

    expect(PatchExecutor).toHaveBeenCalled();
    expect(patchExecutorApply).toHaveBeenCalledWith(expect.objectContaining({
      patch: expect.objectContaining({
        title: "Save SceneBook launch direction",
      }),
      context: expect.objectContaining({
        userId: "user-1",
        projectId: "project-1",
        threadId: "thread-1",
        runId: "run-1",
        source: "agent",
      }),
    }));
    expect(checkGoalProgress).toHaveBeenCalledWith(expect.objectContaining({
      observations: [
        expect.objectContaining({
          toolName: "project_patch",
          status: "completed",
          message: "Saved patch.",
        }),
      ],
    }));
  });

  test("custom runtime executes workflow_call decisions through WorkflowExecutor", async () => {
    process.env.AGENT_ORCHESTRATOR = "custom";
    decideNextStep.mockResolvedValue({
      type: "workflow_call",
      workflowName: "create_full_production_package",
      input: { prompt: "Make the complete production package" },
      reason: "The request needs the full production workflow.",
    });

    const { AgentKernel } = await import("@/lib/agent/runtime-v4/kernel");
    const response = AgentKernel.run({
      projectId: "project-1",
      threadId: "thread-1",
      userId: "user-1",
      message: "Make the complete production package.",
      selectedModels: {},
    });

    await response.text();

    expect(runWorkflow).not.toHaveBeenCalled();
    expect(WorkflowExecutor).toHaveBeenCalledWith(expect.objectContaining({
      modelGateway: {},
      patchExecutor: expect.objectContaining({
        apply: patchExecutorApply,
      }),
      plannedPatchStore: expect.objectContaining({
        source: "supabase-patch-audit",
      }),
    }));
    expect(workflowExecutorExecute).toHaveBeenCalledWith(expect.objectContaining({
      workflowName: "create_full_production_package",
      input: { prompt: "Make the complete production package" },
      projectMind: expect.objectContaining({
        project: expect.objectContaining({
          id: "project-1",
        }),
      }),
      context: expect.objectContaining({
        userId: "user-1",
        projectId: "project-1",
        threadId: "thread-1",
        runId: "run-1",
        source: "agent",
      }),
    }));
    expect(checkGoalProgress).toHaveBeenCalledWith(expect.objectContaining({
      observations: [
        expect.objectContaining({
          toolName: "create_full_production_package",
          output: expect.objectContaining({
            patchAutoApplySkipped: true,
            patchId: "patch-1",
          }),
        }),
      ],
      workflowFinalResponse: "Package planned.",
    }));
  });

  test("custom runtime streams legacy packets and raw runtime-v4 workflow events", async () => {
    process.env.AGENT_ORCHESTRATOR = "custom";
    decideNextStep.mockResolvedValue({
      type: "workflow_call",
      workflowName: "create_full_production_package",
      input: { prompt: "Make the complete production package" },
      reason: "The request needs the full production workflow.",
    });

    const { AgentKernel } = await import("@/lib/agent/runtime-v4/kernel");
    const response = AgentKernel.run({
      projectId: "project-1",
      threadId: "thread-1",
      userId: "user-1",
      message: "Make the complete production package.",
      selectedModels: {},
    });

    const packets = parseSsePackets(await response.text());

    expect(packets).toContainEqual(expect.objectContaining({
      type: "tool_completed",
      workflowName: "create_full_production_package",
      message: "Package planned.",
    }));
    expect(packets).toContainEqual(expect.objectContaining({
      type: "v4_event",
      event: expect.objectContaining({
        type: "workflow_completed",
        runId: "run-1",
        threadId: "thread-1",
        workflowName: "create_full_production_package",
        message: "Package planned.",
      }),
    }));
  });

  test("custom runtime waits for approval without goal checking", async () => {
    process.env.AGENT_ORCHESTRATOR = "custom";
    decideNextStep.mockResolvedValue({
      type: "project_patch",
      reason: "Save grouped workspace state.",
      patch: {
        title: "Save SceneBook launch direction",
        summary: "Save launch reel direction.",
        riskLevel: "low",
        requiresApproval: false,
        operations: [
          {
            type: "update_script_lab",
            input: { hook: "SceneBook keeps the idea alive." },
            requiresApproval: true,
          },
        ],
      },
    });
    patchExecutorApply.mockResolvedValue({
      status: "awaiting_approval",
      patch: {
        title: "Save SceneBook launch direction",
        summary: "Save launch reel direction.",
        riskLevel: "low",
        requiresApproval: false,
        operations: [],
      },
      operations: [],
      summary: "ProjectPatch awaits approval.",
      successfulOperations: 0,
      failedOperations: 0,
      retryable: false,
      approvalRequired: true,
      events: [],
    });

    const { AgentKernel } = await import("@/lib/agent/runtime-v4/kernel");
    const response = AgentKernel.run({
      projectId: "project-1",
      threadId: "thread-1",
      userId: "user-1",
      message: "Save this hook.",
      selectedModels: {},
    });

    await response.text();

    expect(checkGoalProgress).not.toHaveBeenCalled();
    expect(completeAgentRun).toHaveBeenCalledWith("run-1", expect.objectContaining({
      waitingForUser: true,
      goalStatus: "awaiting_approval",
    }));
  });

  test("custom runtime uses runtime-v4 tool summaries for decisions", async () => {
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

    expect(decideNextStep).toHaveBeenCalledWith(expect.objectContaining({
      toolSummaries: [{ name: "update_script_lab" }],
    }));
  });
});
