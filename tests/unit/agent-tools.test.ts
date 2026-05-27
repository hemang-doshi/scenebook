import { beforeEach, describe, expect, test, vi } from "vitest";

import type { ProjectWorkspace } from "@/lib/data/repository";

const appendAgentMessage = vi.fn();
const completeAgentRun = vi.fn();
const completeAgentToolCall = vi.fn();
const createAgentRun = vi.fn();
const createAgentToolCall = vi.fn();
const createOrLoadThread = vi.fn();
const createSupabaseServerClient = vi.fn();
const failAgentRun = vi.fn();
const failAgentToolCall = vi.fn();
const generateText = vi.fn();
const getProjectWorkspace = vi.fn();

vi.mock("@/lib/ai/client", () => ({
  generateText,
}));

vi.mock("@/lib/agent/runtime", () => ({
  appendAgentMessage,
  completeAgentRun,
  completeAgentToolCall,
  createAgentRun,
  createAgentToolCall,
  createOrLoadThread,
  failAgentRun,
  failAgentToolCall,
}));

vi.mock("@/lib/data/repository", () => ({
  getProjectWorkspace,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

const baseProject: ProjectWorkspace = {
  id: "project-1",
  ownerId: "user-1",
  inboxItemId: null,
  title: "Bronze watch hero reel",
  status: "posted",
  format: "reel",
  platform: "instagram",
  topicTags: [],
  experimentTags: [],
  scriptLab: {
    angle: "Show the watch as a tactile luxury object.",
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
    views: 1200,
    likes: 80,
    comments: 12,
    shares: 10,
    saves: 22,
    watchTimeNote: "",
    reflection: "The strongest retention came from the first close-up.",
    decision: "repeat",
    followUpIdea: "Make a sequel focused on the clasp detail.",
  },
  aiSuggestions: {
    hooks: [],
    captions: [],
    rewrites: [],
    shotList: [],
    followUps: [],
    performanceSummary: "Close on the product payoff earlier.",
  },
  assets: [],
  readiness: {
    score: 0,
    label: "Needs work",
    missing: [],
  },
  messages: [],
  generations: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function createAuthSupabase() {
  createSupabaseServerClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: { id: "user-1" },
        },
      }),
    },
  });
}

describe("agent tools", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    appendAgentMessage.mockReset();
    completeAgentRun.mockReset();
    completeAgentToolCall.mockReset();
    createAgentRun.mockReset();
    createAgentToolCall.mockReset();
    createOrLoadThread.mockReset();
    createSupabaseServerClient.mockReset();
    failAgentRun.mockReset();
    failAgentToolCall.mockReset();
    generateText.mockReset();
    getProjectWorkspace.mockReset();
  });

  test("/form-json-prompt creates the expected structured JSON shape", async () => {
    const { formJsonPromptTool } = await import("@/lib/agent/tools/form-json-prompt");
    const result = await formJsonPromptTool.handler(
      {
        projectId: "project-1",
        threadId: "thread-1",
        runId: "run-1",
        rawInput: "/form-json-prompt polished macro reel of a bronze watch in rain",
        project: baseProject,
        selectedModel: null,
      },
      { prompt: "polished macro reel of a bronze watch in rain" },
    );

    expect(result.output).toMatchObject({
      intent: "polished macro reel of a bronze watch in rain",
      subject: "Bronze watch hero reel",
      visual_style: expect.any(String),
      camera: expect.any(String),
      lighting: expect.any(String),
      scene: expect.any(String),
      motion: expect.any(String),
      negative_prompt: expect.any(String),
      output: {
        format: "reel",
        platform: "instagram",
        aspect_ratio: "9:16",
      },
    });
  });

  test("/instagram stays fully dummy and never calls real APIs", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { instagramTool } = await import("@/lib/agent/tools/instagram");
    const result = await instagramTool.handler(
      {
        projectId: "project-1",
        threadId: "thread-1",
        runId: "run-1",
        rawInput: "/instagram prepare_publish",
        project: baseProject,
        selectedModel: null,
      },
      { prompt: "prepare_publish" },
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.output).toMatchObject({
      mode: "dummy",
      requestedAction: "prepare_publish",
      availableActions: expect.arrayContaining(["prepare_publish", "sync_analytics"]),
    });
  });

  test("supported tool commands dispatch through the agent route and log approval-mode tool calls", async () => {
    createAuthSupabase();
    createOrLoadThread.mockResolvedValue({ id: "thread-1" });
    createAgentRun.mockResolvedValue({ id: "run-1" });
    createAgentToolCall.mockResolvedValue({ id: "tool-call-1" });
    appendAgentMessage.mockResolvedValue({ id: "message-1" });
    getProjectWorkspace.mockResolvedValue(baseProject);

    const { POST } = await import("@/app/api/projects/[id]/agent/route");
    const response = await POST(
      new Request("http://localhost/api/projects/project-1/agent", {
        method: "POST",
        body: JSON.stringify({
          threadId: "11111111-1111-4111-8111-111111111111",
          message: "/form-json-prompt polished macro reel of a bronze watch in rain",
        }),
      }),
      {
        params: Promise.resolve({ id: "project-1" }),
      },
    );

    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.tool).toMatchObject({
      type: "tool_result",
      requiresApproval: true,
      toolName: "Form JSON Prompt",
    });
    expect(createAgentToolCall).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        runId: "run-1",
        requiresApproval: true,
      }),
    );
    expect(completeAgentToolCall).toHaveBeenCalledWith(
      "tool-call-1",
      expect.objectContaining({
        intent: "polished macro reel of a bronze watch in rain",
      }),
      true,
    );
    expect(generateText).not.toHaveBeenCalled();
  });

  test("unsupported slash commands return a helpful error", async () => {
    createAuthSupabase();

    const { POST } = await import("@/app/api/projects/[id]/agent/route");
    const response = await POST(
      new Request("http://localhost/api/projects/project-1/agent", {
        method: "POST",
        body: JSON.stringify({
          message: "/unknown do something",
        }),
      }),
      {
        params: Promise.resolve({ id: "project-1" }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("/script"),
    });
    expect(createOrLoadThread).not.toHaveBeenCalled();
  });
});
