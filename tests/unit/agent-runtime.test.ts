import { beforeEach, describe, expect, test, vi } from "vitest";

const createSupabaseServerClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

function createBuilder(result: unknown) {
  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
  };

  return builder;
}

describe("agent runtime", () => {
  beforeEach(() => {
    createSupabaseServerClient.mockReset();
  });

  test("createOrLoadThread creates a new thread when no threadId is provided", async () => {
    const insertBuilder = createBuilder({
      data: {
        id: "thread-1",
        project_id: "project-1",
        owner_id: "user-1",
        title: "Untitled thread",
        status: "active",
        metadata: {},
      },
      error: null,
    });

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: vi.fn((table: string) => {
        if (table === "agent_threads") {
          return insertBuilder;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    createSupabaseServerClient.mockResolvedValue(supabase);

    const { createOrLoadThread } = await import("@/lib/agent/runtime");
    const thread = await createOrLoadThread("project-1");

    expect(supabase.from).toHaveBeenCalledWith("agent_threads");
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: "user-1",
        project_id: "project-1",
      }),
    );
    expect(thread.id).toBe("thread-1");
  });

  test("appendAgentMessage and agent run helpers write the expected records", async () => {
    const messageBuilder = createBuilder({ data: { id: "message-1" }, error: null });
    const threadUpdateBuilder = createBuilder({ error: null });
    const runInsertBuilder = createBuilder({ data: { id: "run-1" }, error: null });
    const runUpdateBuilder = createBuilder({ error: null });

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
      from: vi.fn((table: string) => {
        if (table === "agent_messages") return messageBuilder;
        if (table === "agent_threads") return threadUpdateBuilder;
        if (table === "agent_runs") {
          if (runInsertBuilder.insert.mock.calls.length === 0) {
            return runInsertBuilder;
          }

          return runUpdateBuilder;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    createSupabaseServerClient.mockResolvedValue(supabase);

    const {
      appendAgentMessage,
      completeAgentRun,
      createAgentRun,
      failAgentRun,
    } = await import("@/lib/agent/runtime");

    await appendAgentMessage({
      projectId: "project-1",
      threadId: "thread-1",
      role: "user",
      content: "hello",
    });
    const run = await createAgentRun({
      projectId: "project-1",
      threadId: "thread-1",
      input: "hello",
      selectedModels: { chat: "gemini-2.5-flash" },
    });
    await completeAgentRun(run.id, { output: "done" });
    await failAgentRun(run.id, "boom");

    expect(messageBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: "user-1",
        thread_id: "thread-1",
        role: "user",
        content: "hello",
      }),
    );
    expect(runInsertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: "user-1",
        project_id: "project-1",
        thread_id: "thread-1",
        input: "hello",
      }),
    );
    expect(runUpdateBuilder.update).toHaveBeenCalled();
  });
});
