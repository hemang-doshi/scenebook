import { beforeEach, describe, expect, test, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  authUser: { id: "user-1" } as { id: string } | null,
  ownedProject: { id: "project-1", owner_id: "user-1" } as { id: string; owner_id: string } | null,
  from: vi.fn(),
}));

const runtimeMock = vi.hoisted(() => ({
  listAgentThreads: vi.fn(),
  getAgentHistory: vi.fn(),
}));

const timelineMock = vi.hoisted(() => ({
  loadRuntimeV4TimelineEntries: vi.fn(),
}));

const kernelMock = vi.hoisted(() => ({
  run: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: supabaseMock.authUser } }),
    },
    from: supabaseMock.from,
  }),
}));

vi.mock("@/lib/agent/runtime", () => ({
  appendAgentMessage: vi.fn(),
  completeAgentToolCall: vi.fn(),
  completeAgentRun: vi.fn(),
  createAgentToolCall: vi.fn(),
  createAgentRun: vi.fn(),
  createOrLoadThread: vi.fn(),
  failAgentToolCall: vi.fn(),
  failAgentRun: vi.fn(),
  getAgentHistory: runtimeMock.getAgentHistory,
  getAgentToolCall: vi.fn(),
  listAgentThreads: runtimeMock.listAgentThreads,
}));

vi.mock("@/lib/agent/runtime-v4/ui/timeline", () => ({
  loadRuntimeV4TimelineEntries: timelineMock.loadRuntimeV4TimelineEntries,
}));

vi.mock("@/lib/agent/runtime-v4/kernel", () => ({
  AgentKernel: {
    run: kernelMock.run,
  },
}));

function selectChain(data: unknown) {
  return {
    eq() {
      return this;
    },
    maybeSingle: async () => ({ data, error: null }),
  };
}

describe("agent route auth boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.AGENT_HARNESS_RUNTIME_ENABLED = "true";
    process.env.AGENT_HARNESS_RUNTIME_VERSION = "v4";
    supabaseMock.authUser = { id: "user-1" };
    supabaseMock.ownedProject = { id: "project-1", owner_id: "user-1" };
    supabaseMock.from.mockImplementation((table: string) => ({
      select: () => selectChain(table === "content_cards" ? supabaseMock.ownedProject : null),
    }));
    runtimeMock.listAgentThreads.mockResolvedValue([{ id: "thread-1" }]);
    runtimeMock.getAgentHistory.mockResolvedValue({
      thread: { id: "thread-1" },
      messages: [],
      toolCalls: [],
    });
    timelineMock.loadRuntimeV4TimelineEntries.mockResolvedValue([]);
    kernelMock.run.mockResolvedValue(new Response("ok"));
  });

  test("agent GET rejects non-owner before loading threads or history", async () => {
    supabaseMock.ownedProject = null;
    const { GET } = await import("@/app/api/projects/[id]/agent/route");

    const response = await GET(new Request("http://localhost/api/projects/project-1/agent?listThreads=true"), {
      params: Promise.resolve({ id: "project-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({ error: "Project not found." });
    expect(runtimeMock.listAgentThreads).not.toHaveBeenCalled();
    expect(runtimeMock.getAgentHistory).not.toHaveBeenCalled();
    expect(timelineMock.loadRuntimeV4TimelineEntries).not.toHaveBeenCalled();
  });

  test("agent GET allows owner and returns thread entries", async () => {
    const { GET } = await import("@/app/api/projects/[id]/agent/route");

    const response = await GET(new Request("http://localhost/api/projects/project-1/agent?threadId=00000000-0000-4000-8000-000000000001"), {
      params: Promise.resolve({ id: "project-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(runtimeMock.getAgentHistory).toHaveBeenCalledWith("project-1", "00000000-0000-4000-8000-000000000001");
    expect(timelineMock.loadRuntimeV4TimelineEntries).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "user-1",
      projectId: "project-1",
      threadId: "thread-1",
    }));
    expect(payload).toMatchObject({
      threadId: "thread-1",
      entries: [],
    });
  });

  test("agent POST runtime-v4 rejects non-owner before invoking AgentKernel", async () => {
    supabaseMock.ownedProject = null;
    const { POST } = await import("@/app/api/projects/[id]/agent/route");

    const response = await POST(new Request("http://localhost/api/projects/project-1/agent", {
      method: "POST",
      body: JSON.stringify({ message: "Help me plan this reel" }),
    }), {
      params: Promise.resolve({ id: "project-1" }),
    });

    expect(response.status).toBe(404);
    expect(kernelMock.run).not.toHaveBeenCalled();
  });

  test("agent POST runtime-v4 passes account and permissions into AgentKernel", async () => {
    const { POST } = await import("@/app/api/projects/[id]/agent/route");

    await POST(new Request("http://localhost/api/projects/project-1/agent", {
      method: "POST",
      body: JSON.stringify({ message: "Help me plan this reel" }),
    }), {
      params: Promise.resolve({ id: "project-1" }),
    });

    expect(kernelMock.run).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      userId: "user-1",
      account: expect.objectContaining({
        userId: "user-1",
        projectId: "project-1",
        role: "owner",
      }),
      permissions: expect.objectContaining({
        canManageIntegrations: true,
        canWriteProject: true,
      }),
    }));
  });
});
