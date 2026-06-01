import { beforeEach, describe, expect, test, vi } from "vitest";

import type { AgentToolCallRecord } from "@/lib/agent/types";
import type { ProjectSnapshot } from "@/lib/agent/runtime-v3/types";
import type { ProjectWorkspace } from "@/lib/data/repository";

const appendAgentMessage = vi.fn();
const completeAgentRun = vi.fn();
const completeAgentToolCall = vi.fn();
const createAgentRun = vi.fn();
const createAgentToolCall = vi.fn();
const createOrLoadThread = vi.fn();
const failAgentRun = vi.fn();
const failAgentToolCall = vi.fn();
const getAgentHistory = vi.fn();
const getAgentToolCall = vi.fn();
const listAgentThreads = vi.fn();
const createProjectArtifact = vi.fn();
const createMemorySnapshot = vi.fn();
const getLatestProjectMemory = vi.fn();
const createAssetFolder = vi.fn();
const getProjectAssetLibrary = vi.fn();
const listProjectAssetFolders = vi.fn();
const moveAssetToFolder = vi.fn();
const getProjectWorkspace = vi.fn();
const updateCard = vi.fn();
const createSupabaseServerClient = vi.fn();
const generateText = vi.fn();
const generateTextStream = vi.fn();
const generateToolHandler = vi.fn();
const generateProjectMedia = vi.fn();
const agentKernelRun = vi.fn();
const agentV4KernelRun = vi.fn();

vi.mock("@/lib/agent/runtime", () => ({
  appendAgentMessage,
  completeAgentRun,
  completeAgentToolCall,
  createAgentRun,
  createAgentToolCall,
  createOrLoadThread,
  failAgentRun,
  failAgentToolCall,
  getAgentHistory,
  getAgentToolCall,
  listAgentThreads,
}));

vi.mock("@/lib/agent/artifacts", () => ({
  createProjectArtifact,
}));

vi.mock("@/lib/agent/memory", () => ({
  createMemorySnapshot,
  getLatestProjectMemory,
}));

vi.mock("@/lib/assets/asset-folders", () => ({
  createAssetFolder,
  getProjectAssetLibrary,
  listProjectAssetFolders,
  moveAssetToFolder,
}));

vi.mock("@/lib/data/repository", () => ({
  getProjectWorkspace,
  updateCard,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

vi.mock("@/lib/ai/client", () => ({
  generateText,
  generateTextStream,
}));

vi.mock("@/lib/agent/tools/generate", () => ({
  generateTool: {
    command: "generate",
    name: "Generate Asset",
    requiresApproval: false,
    availability: "available",
    inputSchema: { parse: (value: unknown) => value },
    handler: generateToolHandler,
  },
  generateImageTool: {
    command: "generate-image",
    name: "Generate Image",
    requiresApproval: false,
    availability: "available",
    inputSchema: { parse: (value: unknown) => value },
    handler: generateToolHandler,
  },
  generateVideoTool: {
    command: "generate-video",
    name: "Generate Video",
    requiresApproval: false,
    availability: "available",
    inputSchema: { parse: (value: unknown) => value },
    handler: generateToolHandler,
  },
  generateAudioTool: {
    command: "generate-audio",
    name: "Generate Audio",
    requiresApproval: false,
    availability: "available",
    inputSchema: { parse: (value: unknown) => value },
    handler: generateToolHandler,
  },
}));

vi.mock("@/lib/generation/generate-media", () => ({
  generateProjectMedia,
}));

vi.mock("@/lib/agent/runtime-v3/kernel", () => ({
  AgentKernel: {
    run: agentKernelRun,
  },
}));

vi.mock("@/lib/agent/runtime-v4/kernel", () => ({
  AgentKernel: {
    run: agentV4KernelRun,
  },
}));

const originalRuntimeFlag = process.env.AGENT_HARNESS_RUNTIME_ENABLED;
const originalRuntimeVersion = process.env.AGENT_HARNESS_RUNTIME_VERSION;

type ProjectOverrides = Partial<Omit<ProjectWorkspace, "scriptLab" | "shootPack" | "analyticsJournal">> & {
  scriptLab?: Partial<ProjectWorkspace["scriptLab"]>;
  shootPack?: Partial<ProjectWorkspace["shootPack"]>;
  analyticsJournal?: Partial<ProjectWorkspace["analyticsJournal"]>;
};

function project(overrides: ProjectOverrides = {}): ProjectWorkspace {
  const base: ProjectWorkspace = {
    id: "project-1",
    ownerId: "user-1",
    inboxItemId: null,
    title: "Bronze watch hero reel",
    status: "idea",
    format: "reel",
    platform: "instagram",
    topicTags: [],
    experimentTags: [],
    scriptLab: {
      angle: "Luxury detail macro.",
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
    analyticsJournal: {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      watchTimeNote: "",
      reflection: "",
      decision: "repeat",
      followUpIdea: "",
    },
    aiSuggestions: {
      hooks: [],
      captions: [],
      rewrites: [],
      shotList: [],
      followUps: [],
      performanceSummary: "",
    },
    assets: [],
    readiness: {
      score: 0,
      label: "Needs work",
      missing: [],
    },
    generations: [],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };

  return {
    ...base,
    ...overrides,
    scriptLab: {
      ...base.scriptLab,
      ...overrides.scriptLab,
    },
    shootPack: {
      ...base.shootPack,
      ...overrides.shootPack,
    },
    analyticsJournal: {
      ...base.analyticsJournal,
      ...overrides.analyticsJournal,
    },
  };
}

function snapshot(overrides: Partial<ProjectSnapshot> = {}): ProjectSnapshot {
  const workspace = project({
    status: "idea",
    scriptLab: {
      hook: "Hook",
      outline: "Outline",
      script: "Script",
      caption: "Caption",
      cta: "CTA",
    },
  });

  const next: ProjectSnapshot = {
    project: {
      id: workspace.id,
      title: workspace.title,
      platform: workspace.platform,
      format: workspace.format,
      status: workspace.status,
    },
    creativeBrief: null,
    activeGoal: null,
    scriptLab: workspace.scriptLab,
    scriptVersions: [],
    shootPack: workspace.shootPack,
    assets: {
      count: 0,
      folders: [],
      looseAssetCount: 0,
      recent: [],
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
    analytics: workspace.analyticsJournal,
    conversation: {
      recentMessages: [],
    },
    toolHistory: [],
    memory: [],
    readiness: {
      briefCompleteness: 0,
      scriptCompleteness: 100,
      assetReadiness: 0,
      shootReadiness: 0,
      editorReadiness: 0,
      publishReadiness: 0,
      nextLikelyStage: "asset_planning",
      missing: [],
    },
  };

  return {
    ...next,
    ...overrides,
  };
}

function createBuilder(result: { data: unknown; error: unknown }, options: { limitReturnsResult?: boolean } = {}) {
  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => (options.limitReturnsResult ? Promise.resolve(result) : builder)),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
  };

  return builder;
}

function mockStateSupabase() {
  const creativeBrief = createBuilder({
    data: {
      audience: "founders",
      platform: "instagram",
      format: "reel",
      duration_seconds: 30,
      tone: "premium",
      core_angle: "Make the clasp feel engineered.",
      viewer_promise: "A fast way to judge watch build quality.",
      visual_style: "macro product",
      cta: "Save this for your next watch purchase.",
      open_questions: ["Which model?"],
    },
    error: null,
  });
  const activeGoal = createBuilder({
    data: {
      id: "goal-1",
      title: "Ship the reel",
      status: "active",
      stage: "scripting",
      completed_steps: ["brief"],
      next_actions: ["write hook"],
      blockers: [],
      metadata: { source: "test" },
    },
    error: null,
  });
  const scriptVersions = createBuilder(
    {
      data: [{ id: "version-1", title: "Draft 1", active: true, created_at: "2026-06-01T01:00:00.000Z" }],
      error: null,
    },
    { limitReturnsResult: true },
  );

  createSupabaseServerClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
    from: vi.fn((table: string) => {
      if (table === "project_creative_briefs") return creativeBrief;
      if (table === "agent_goals") return activeGoal;
      if (table === "script_versions") return scriptVersions;
      throw new Error(`Unexpected table ${table}`);
    }),
  });
}

function mockAuthSupabase() {
  createSupabaseServerClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
  });
}

function toolCall(overrides: Partial<AgentToolCallRecord> = {}): AgentToolCallRecord {
  return {
    id: "tool-call-1",
    owner_id: "user-1",
    run_id: "run-1",
    thread_id: "thread-1",
    project_id: "project-1",
    tool_name: "update_script_lab",
    command: null,
    status: "running",
    input: {},
    output: {},
    requires_approval: false,
    ...overrides,
  };
}

function resetMocks() {
  appendAgentMessage.mockReset();
  completeAgentRun.mockReset();
  completeAgentToolCall.mockReset();
  createAgentRun.mockReset();
  createAgentToolCall.mockReset();
  createOrLoadThread.mockReset();
  failAgentRun.mockReset();
  failAgentToolCall.mockReset();
  getAgentHistory.mockReset();
  getAgentToolCall.mockReset();
  listAgentThreads.mockReset();
  createProjectArtifact.mockReset();
  createMemorySnapshot.mockReset();
  getLatestProjectMemory.mockReset();
  createAssetFolder.mockReset();
  getProjectAssetLibrary.mockReset();
  listProjectAssetFolders.mockReset();
  moveAssetToFolder.mockReset();
  getProjectWorkspace.mockReset();
  updateCard.mockReset();
  createSupabaseServerClient.mockReset();
  generateText.mockReset();
  generateTextStream.mockReset();
  generateToolHandler.mockReset();
  generateProjectMedia.mockReset();
  agentKernelRun.mockReset();
  agentV4KernelRun.mockReset();
  if (originalRuntimeFlag === undefined) {
    delete process.env.AGENT_HARNESS_RUNTIME_ENABLED;
  } else {
    process.env.AGENT_HARNESS_RUNTIME_ENABLED = originalRuntimeFlag;
  }
  if (originalRuntimeVersion === undefined) {
    delete process.env.AGENT_HARNESS_RUNTIME_VERSION;
  } else {
    process.env.AGENT_HARNESS_RUNTIME_VERSION = originalRuntimeVersion;
  }
}

describe("runtime-v3 foundation", () => {
  beforeEach(() => {
    vi.resetModules();
    resetMocks();
  });

  test("ProjectSnapshot includes readiness, brief, goal, assets, memory, and history", async () => {
    const workspace = project({
      scriptLab: {
        hook: "Macro detail hook",
        script: "A short product script",
        caption: "Caption",
        cta: "Follow for watch details.",
      },
    });
    getProjectWorkspace.mockResolvedValue(workspace);
    getAgentHistory.mockResolvedValue({
      thread: { id: "thread-1" },
      messages: [{ role: "user", content: "write a hook", created_at: "2026-06-01T00:00:00.000Z" }],
      toolCalls: [{ id: "tool-1", tool_name: "update_script_lab", status: "completed", command: null }],
    });
    getProjectAssetLibrary.mockResolvedValue({
      folders: [
        {
          id: "folder-1",
          name: "Hero stills",
          assets: [{ id: "asset-1", title: "Clasp macro", type: "image", url: "https://example.com/a.png" }],
        },
      ],
      looseAssets: [{ id: "asset-2", title: "Dial macro", type: "image", url: "https://example.com/b.png" }],
    });
    getLatestProjectMemory.mockResolvedValue({
      summary: "User prefers premium macro shots.",
      created_at: "2026-06-01T00:05:00.000Z",
      metadata: { preference: "macro" },
    });
    mockStateSupabase();

    const { buildProjectSnapshot } = await import("@/lib/agent/runtime-v3/context/project-snapshot");
    const result = await buildProjectSnapshot({ projectId: "project-1", threadId: "thread-1" });

    expect(result.creativeBrief).toMatchObject({
      audience: "founders",
      coreAngle: "Make the clasp feel engineered.",
      openQuestions: ["Which model?"],
    });
    expect(result.activeGoal).toMatchObject({
      id: "goal-1",
      title: "Ship the reel",
      nextActions: ["write hook"],
    });
    expect(result.assets).toMatchObject({
      count: 2,
      folders: [{ id: "folder-1", name: "Hero stills", assetCount: 1 }],
      looseAssetCount: 1,
    });
    expect(result.memory[0].summary).toContain("premium macro");
    expect(result.conversation.recentMessages[0].content).toBe("write a hook");
    expect(result.toolHistory[0].toolName).toBe("update_script_lab");
    expect(result.readiness.briefCompleteness).toBeGreaterThan(50);
    expect(result.readiness.missing).toContain("shoot pack");
  });

  test("decideNextStep asks questions for vague scripts and routes explicit hooks to workspace control", async () => {
    const { decideNextStep } = await import("@/lib/agent/runtime-v3/decision/decide-next-step");
    const baseSnapshot = snapshot();

    const vague = await decideNextStep({
      message: "write a script",
      snapshot: baseSnapshot,
      toolSummaries: [],
    });
    expect(vague).toMatchObject({
      type: "ask_question",
      expectedFieldTargets: ["audience", "coreAngle", "tone"],
    });

    const hook = await decideNextStep({
      message: "hook: This clasp tells you everything",
      snapshot: baseSnapshot,
      toolSummaries: [],
    });
    expect(hook).toEqual({
      type: "workflow_call",
      workflowName: "workspace_control_workflow",
      input: { request: "hook: This clasp tells you everything" },
      reason: "User requested a direct workspace control action.",
    });
  });

  test("decideNextStep routes SceneBook positioning corrections to workspace control", async () => {
    const { decideNextStep } = await import("@/lib/agent/runtime-v3/decision/decide-next-step");
    const baseSnapshot = snapshot();
    const correction = [
      "i want to chnage this. scenebook is something completely different:",
      "SceneBook is basically a **creator operating system for short-form video builders**.",
      "It helps creators plan, generate, organize, edit, and improve reels from idea to analytics.",
    ].join("\n");

    const decision = await decideNextStep({
      message: correction,
      snapshot: baseSnapshot,
      toolSummaries: [],
    });

    expect(decision).toEqual({
      type: "workflow_call",
      workflowName: "workspace_control_workflow",
      input: { request: correction, mode: "positioning_update" },
      reason: "User corrected SceneBook positioning and asked the workspace to change.",
    });
  });

  test("policy requires finalized script approval and blocks unavailable editor and publish tools", async () => {
    const { checkPolicy } = await import("@/lib/agent/runtime-v3/policy/policy-engine");
    const { getRuntimeV3Tool } = await import("@/lib/agent/runtime-v3/tools/registry");
    const finalized = snapshot({
      project: {
        id: "project-1",
        title: "Bronze watch hero reel",
        platform: "instagram",
        format: "reel",
        status: "posted",
      },
    });

    const scriptPolicy = checkPolicy({
      tool: getRuntimeV3Tool("update_script_lab")!,
      toolInput: { hook: "New hook" },
      snapshot: finalized,
    });
    expect(scriptPolicy).toMatchObject({
      allowed: true,
      requiresApproval: true,
      risk: "medium",
    });
    expect(scriptPolicy.preview?.before).toMatchObject({ hook: "Hook" });

    for (const toolName of ["write_editor_timeline", "publish_to_instagram"]) {
      const policy = checkPolicy({
        tool: getRuntimeV3Tool(toolName)!,
        toolInput: {},
        snapshot: finalized,
      });
      expect(policy).toMatchObject({
        allowed: false,
        requiresApproval: false,
        risk: "blocked",
      });
      expect(policy.reason).toContain("requires_integration");
    }
  });

  test("executor completes verified script mutations without approval on draft projects", async () => {
    const before = project({ status: "idea" });
    const after = project({ status: "idea", scriptLab: { hook: "This clasp tells you everything" } });
    getProjectWorkspace.mockResolvedValueOnce(before).mockResolvedValueOnce(after);
    updateCard.mockResolvedValue(undefined);
    createAgentToolCall.mockResolvedValue(toolCall({ id: "tool-call-1" }));
    completeAgentToolCall.mockResolvedValue(undefined);
    const stream = { emit: vi.fn(), emitLegacyTool: vi.fn() };

    const draftSnapshot = snapshot({
      project: {
        id: "project-1",
        title: "Bronze watch hero reel",
        platform: "instagram",
        format: "reel",
        status: "idea",
      },
    });
    const { executeRuntimeV3Tool } = await import("@/lib/agent/runtime-v3/tools/executor");
    const result = await executeRuntimeV3Tool({
      toolName: "update_script_lab",
      rawInput: { hook: "This clasp tells you everything" },
      context: {
        projectId: "project-1",
        threadId: "thread-1",
        runId: "run-1",
        userId: "user-1",
        rawInput: "hook: This clasp tells you everything",
        snapshot: draftSnapshot,
        selectedModels: {},
      },
      snapshot: draftSnapshot,
      stream: stream as never,
    });

    expect(result.status).toBe("completed");
    expect(updateCard).toHaveBeenCalledWith("project-1", {
      scriptLab: expect.objectContaining({ hook: "This clasp tells you everything" }),
    });
    expect(completeAgentToolCall).toHaveBeenCalledWith(
      "tool-call-1",
      expect.objectContaining({
        kind: "script_lab_update",
        verification: expect.objectContaining({ verified: true }),
      }),
      "completed",
      expect.objectContaining({
        verification: expect.objectContaining({ verified: true }),
        sideEffect: "db_write",
        approvalPolicy: "ask_if_overwrite",
      }),
    );
    expect(stream.emit).toHaveBeenCalledWith("tool_completed", expect.objectContaining({ toolCallId: "tool-call-1" }));
  });

  test("executor persists approval metadata for finalized script overwrites", async () => {
    createAgentToolCall.mockResolvedValue(toolCall({ id: "tool-call-approval" }));
    completeAgentToolCall.mockResolvedValue(undefined);
    const stream = { emit: vi.fn(), emitLegacyTool: vi.fn() };

    const postedSnapshot = snapshot({
      project: {
        id: "project-1",
        title: "Bronze watch hero reel",
        platform: "instagram",
        format: "reel",
        status: "posted",
      },
    });
    const { executeRuntimeV3Tool } = await import("@/lib/agent/runtime-v3/tools/executor");
    const result = await executeRuntimeV3Tool({
      toolName: "update_script_lab",
      rawInput: { hook: "New approved hook" },
      context: {
        projectId: "project-1",
        threadId: "thread-1",
        runId: "run-1",
        userId: "user-1",
        rawInput: "hook: New approved hook",
        snapshot: postedSnapshot,
        selectedModels: {},
      },
      snapshot: postedSnapshot,
      stream: stream as never,
    });

    expect(result.status).toBe("awaiting_approval");
    expect(createAgentToolCall).toHaveBeenCalledWith(
      expect.objectContaining({
        toolName: "update_script_lab",
        requiresApproval: true,
        risk: "medium",
        approvalReason: expect.stringContaining("past scripting"),
        availability: "available",
        sideEffect: "db_write",
        approvalPolicy: "ask_if_overwrite",
        verification: expect.objectContaining({ verified: false }),
      }),
    );
    expect(completeAgentToolCall).toHaveBeenCalledWith(
      "tool-call-approval",
      expect.objectContaining({
        kind: "approval_request",
        risk: "medium",
        verification: expect.objectContaining({ message: "Awaiting approval before execution." }),
      }),
      "awaiting_approval",
      expect.objectContaining({
        approvalReason: expect.stringContaining("past scripting"),
        verification: expect.objectContaining({ verified: false }),
      }),
    );
  });

  test("asset generation failure produces a failed observation and no success completion", async () => {
    createAgentToolCall.mockResolvedValue(toolCall({ id: "tool-call-asset" }));
    failAgentToolCall.mockResolvedValue(undefined);
    generateProjectMedia.mockRejectedValue(new Error("Image provider rejected the prompt."));
    const stream = { emit: vi.fn(), emitLegacyTool: vi.fn() };

    const { executeRuntimeV3Tool } = await import("@/lib/agent/runtime-v3/tools/executor");
    const testSnapshot = snapshot();
    const result = await executeRuntimeV3Tool({
      toolName: "generate_media_asset",
      rawInput: { prompt: "macro clasp image", modality: "image" },
      context: {
        projectId: "project-1",
        threadId: "thread-1",
        runId: "run-1",
        userId: "user-1",
        rawInput: "generate macro clasp image",
        snapshot: testSnapshot,
        selectedModels: {},
      },
      snapshot: testSnapshot,
      stream: stream as never,
    });

    expect(result).toMatchObject({
      status: "failed",
      message: "Image provider rejected the prompt.",
      output: { kind: "tool_error", message: "Image provider rejected the prompt." },
    });
    expect(failAgentToolCall).toHaveBeenCalledWith(
      "tool-call-asset",
      "Image provider rejected the prompt.",
      expect.objectContaining({
        verification: expect.objectContaining({ verified: false }),
      }),
    );
    expect(completeAgentToolCall).not.toHaveBeenCalledWith(
      "tool-call-asset",
      expect.anything(),
      "completed",
      expect.anything(),
    );
    expect(stream.emit).not.toHaveBeenCalledWith("tool_completed", expect.anything());
  });

  test("approval resume re-checks policy and refuses unavailable publish actions", async () => {
    getAgentToolCall.mockResolvedValue(toolCall({
      id: "tool-call-publish",
      status: "awaiting_approval",
      tool_name: "publish_to_instagram",
      input: { request: "publish now" },
      requires_approval: true,
    }));
    getProjectWorkspace.mockResolvedValue(project({ status: "posted" }));
    getAgentHistory.mockResolvedValue({ thread: null, messages: [], toolCalls: [] });
    getProjectAssetLibrary.mockResolvedValue({ folders: [], looseAssets: [] });
    getLatestProjectMemory.mockResolvedValue(null);
    mockStateSupabase();
    failAgentToolCall.mockResolvedValue(undefined);

    const { approveRuntimeV3ToolCall } = await import("@/lib/agent/runtime-v3/tools/executor");
    await expect(
      approveRuntimeV3ToolCall({
        toolCallId: "tool-call-publish",
        userId: "user-1",
      }),
    ).rejects.toThrow("requires_integration");

    expect(failAgentToolCall).toHaveBeenCalledWith(
      "tool-call-publish",
      expect.stringContaining("requires_integration"),
      expect.objectContaining({
        verification: expect.objectContaining({ verified: false }),
      }),
    );
  });

  test("agent route delegates POST to runtime-v4 when the feature flag is enabled", async () => {
    process.env.AGENT_HARNESS_RUNTIME_ENABLED = "true";
    mockAuthSupabase();
    agentV4KernelRun.mockResolvedValue(new Response("runtime-v4", { status: 202 }));

    const { POST } = await import("@/app/api/projects/[id]/agent/route");
    const response = await POST(
      new Request("http://localhost/api/projects/project-1/agent", {
        method: "POST",
        body: JSON.stringify({ message: "hello runtime" }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(202);
    expect(await response.text()).toBe("runtime-v4");
    expect(agentV4KernelRun).toHaveBeenCalledWith({
      projectId: "project-1",
      threadId: undefined,
      userId: "user-1",
      message: "hello runtime",
      selectedModels: undefined,
      attachments: undefined,
    });
    expect(agentKernelRun).not.toHaveBeenCalled();
    expect(createOrLoadThread).not.toHaveBeenCalled();
  });

  test("agent route can still delegate POST to runtime-v3 when explicitly requested", async () => {
    process.env.AGENT_HARNESS_RUNTIME_ENABLED = "true";
    process.env.AGENT_HARNESS_RUNTIME_VERSION = "v3";
    mockAuthSupabase();
    agentKernelRun.mockResolvedValue(new Response("runtime-v3", { status: 202 }));

    const { POST } = await import("@/app/api/projects/[id]/agent/route");
    const response = await POST(
      new Request("http://localhost/api/projects/project-1/agent", {
        method: "POST",
        body: JSON.stringify({ message: "hello runtime" }),
      }),
      { params: Promise.resolve({ id: "project-1" }) },
    );

    expect(response.status).toBe(202);
    expect(await response.text()).toBe("runtime-v3");
    expect(agentKernelRun).toHaveBeenCalledWith({
      projectId: "project-1",
      threadId: undefined,
      userId: "user-1",
      message: "hello runtime",
      selectedModels: undefined,
      attachments: undefined,
    });
    expect(agentV4KernelRun).not.toHaveBeenCalled();
    expect(createOrLoadThread).not.toHaveBeenCalled();
  });
});
