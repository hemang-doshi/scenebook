import { beforeEach, describe, expect, test, vi } from "vitest";

const createSupabaseServerClient = vi.hoisted(() => vi.fn());

const appendAgentMessage = vi.hoisted(() => vi.fn());
const completeAgentRun = vi.hoisted(() => vi.fn());
const completeAgentToolCall = vi.hoisted(() => vi.fn());
const createAgentRun = vi.hoisted(() => vi.fn());
const createAgentToolCall = vi.hoisted(() => vi.fn());
const createOrLoadThread = vi.hoisted(() => vi.fn());
const failAgentRun = vi.hoisted(() => vi.fn());
const failAgentToolCall = vi.hoisted(() => vi.fn());
const getAgentHistory = vi.hoisted(() => vi.fn());
const getAgentToolCall = vi.hoisted(() => vi.fn());
const listAgentThreads = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
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
  getAgentHistory,
  getAgentToolCall,
  listAgentThreads,
}));

vi.mock("@/lib/ai/client", () => ({
  generateTextStream: vi.fn(),
}));

vi.mock("@/lib/agent/artifacts", () => ({
  createProjectArtifact: vi.fn(),
}));

vi.mock("@/lib/agent/memory", () => ({
  createMemorySnapshot: vi.fn(),
}));

vi.mock("@/lib/data/repository", () => ({
  getProjectWorkspace: vi.fn(),
  updateCard: vi.fn(),
}));

const ownerId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const threadId = "33333333-3333-4333-8333-333333333333";
const runId = "44444444-4444-4444-8444-444444444444";

type TableRows = Record<string, Array<Record<string, unknown>>>;

function createTimelineSupabase(rows: TableRows) {
  const tableCalls: Array<{ table: string; filters: Record<string, unknown> }> = [];

  const matches = (row: Record<string, unknown>, filters: Record<string, unknown>) =>
    Object.entries(filters).every(([key, value]) => row[key] === value);

  return {
    tableCalls,
    client: {
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: { id: ownerId },
          },
        })),
      },
      from: vi.fn((table: string) => {
        const filters: Record<string, unknown> = {};
        const builder = {
          select: vi.fn(() => builder),
          eq: vi.fn((column: string, value: unknown) => {
            filters[column] = value;
            return builder;
          }),
          order: vi.fn(async (column: string, options?: { ascending?: boolean }) => {
            tableCalls.push({ table, filters: { ...filters } });
            const ascending = options?.ascending !== false;
            const data = [...(rows[table] ?? [])]
              .filter((row) => matches(row, filters))
              .sort((a, b) => {
                const left = typeof a[column] === "string" ? Date.parse(a[column] as string) : 0;
                const right = typeof b[column] === "string" ? Date.parse(b[column] as string) : 0;
                return ascending ? left - right : right - left;
              });

            return { data, error: null };
          }),
        };

        return builder;
      }),
    },
  };
}

describe("runtime-v4 UI timeline hydration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    createSupabaseServerClient.mockReset();
  });

  test("planned patch is hydrated after refresh", async () => {
    const supabase = createTimelineSupabase({
      agent_project_patches: [
        {
          id: "patch-1",
          owner_id: ownerId,
          project_id: projectId,
          thread_id: threadId,
          run_id: runId,
          title: "Save full production package",
          summary: "Persist the planned workflow package.",
          reason: "The workflow generated durable workspace changes.",
          risk_level: "medium",
          status: "planned",
          requires_approval: false,
          successful_operations: 0,
          failed_operations: 0,
          retryable: false,
          patch: {
            id: "patch-1",
            operations: [
              { type: "update_creative_brief", input: { tone: "warm" } },
              { type: "create_project_artifact", input: { title: "Shot list" } },
            ],
          },
          metadata: {
            workflowName: "create_full_production_package",
            autoApplySkipped: true,
            autoApplyReason: "Patch has more operations than the auto-apply limit.",
            operationCount: 2,
          },
          created_at: "2026-06-02T08:01:00.000Z",
          updated_at: "2026-06-02T08:01:00.000Z",
          completed_at: null,
        },
      ],
      agent_project_patch_operations: [],
      project_artifacts: [],
      agent_run_summaries: [],
    });

    const { loadRuntimeV4TimelineEntries } = await import("@/lib/agent/runtime-v4/ui/timeline");
    const entries = await loadRuntimeV4TimelineEntries({
      supabase: supabase.client,
      ownerId,
      projectId,
      threadId,
      messages: [],
      toolCalls: [],
    });

    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "patch",
        kind: "patch",
        patchId: "patch-1",
        title: "Save full production package",
        status: "planned",
        riskLevel: "medium",
        operationCount: 2,
        canApply: true,
        autoApplySkipped: true,
        autoApplyReason: expect.stringContaining("auto-apply limit"),
        workflowName: "create_full_production_package",
        operations: [
          expect.objectContaining({
            operationIndex: 0,
            type: "update_creative_brief",
            operationType: "update_creative_brief",
            toolName: "update_creative_brief",
            status: "planned",
            input: { tone: "warm" },
          }),
          expect.objectContaining({
            operationIndex: 1,
            type: "create_project_artifact",
            operationType: "create_project_artifact",
            toolName: "create_project_artifact",
            status: "planned",
            input: { title: "Shot list" },
          }),
        ],
      }),
    ]));
  });

  test("workflow timeline entry maps from workflow metadata persisted on patch rows", async () => {
    const supabase = createTimelineSupabase({
      agent_project_patches: [
        {
          id: "patch-workflow-1",
          owner_id: ownerId,
          project_id: projectId,
          thread_id: threadId,
          run_id: runId,
          title: "Save shoot pack",
          summary: "Persist the shoot pack workflow output.",
          risk_level: "low",
          status: "awaiting_approval",
          requires_approval: true,
          successful_operations: 0,
          failed_operations: 0,
          retryable: false,
          patch: { operations: [] },
          metadata: {
            workflowName: "create_shoot_pack",
            workflowStatus: "needs_input",
            workflowSummary: "Shoot pack workflow is waiting for approval.",
          },
          created_at: "2026-06-02T08:03:00.000Z",
        },
      ],
      agent_project_patch_operations: [],
      project_artifacts: [],
      agent_run_summaries: [],
    });

    const { loadRuntimeV4TimelineEntries } = await import("@/lib/agent/runtime-v4/ui/timeline");
    const entries = await loadRuntimeV4TimelineEntries({
      supabase: supabase.client,
      ownerId,
      projectId,
      threadId,
      messages: [],
      toolCalls: [],
    });

    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "workflow",
        kind: "workflow",
        workflowName: "create_shoot_pack",
        status: "needs_input",
        sourceType: "patch",
        sourceId: "patch-workflow-1",
        summary: "Shoot pack workflow is waiting for approval.",
      }),
    ]));
  });

  test("artifact timeline entry maps from workflow project artifact rows", async () => {
    const supabase = createTimelineSupabase({
      agent_project_patches: [],
      agent_project_patch_operations: [],
      project_artifacts: [
        {
          id: "artifact-1",
          owner_id: ownerId,
          project_id: projectId,
          thread_id: threadId,
          tool_call_id: "tool-1",
          artifact_type: "script_package",
          title: "Launch reel script package",
          payload: {
            summary: "A tight launch reel script with a product payoff.",
            hook: "Stop app hopping.",
          },
          metadata: {
            workflowName: "create_script_package",
          },
          created_at: "2026-06-02T08:02:00.000Z",
          updated_at: "2026-06-02T08:02:00.000Z",
        },
      ],
      agent_run_summaries: [],
    });

    const { loadRuntimeV4TimelineEntries } = await import("@/lib/agent/runtime-v4/ui/timeline");
    const entries = await loadRuntimeV4TimelineEntries({
      supabase: supabase.client,
      ownerId,
      projectId,
      threadId,
      messages: [],
      toolCalls: [],
    });

    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: "artifact",
        kind: "artifact",
        artifactId: "artifact-1",
        artifactType: "script_package",
        title: "Launch reel script package",
        summary: "A tight launch reel script with a product payoff.",
        workflowName: "create_script_package",
        payload: expect.objectContaining({
          hook: "Stop app hopping.",
        }),
      }),
      expect.objectContaining({
        type: "workflow",
        kind: "workflow",
        workflowName: "create_script_package",
        sourceType: "artifact",
        sourceId: "artifact-1",
      }),
    ]));
  });

  test("GET returns sorted entries while preserving old messages and toolCalls fields", async () => {
    const message = {
      id: "message-1",
      owner_id: ownerId,
      project_id: projectId,
      thread_id: threadId,
      role: "user",
      content: "Make a launch reel.",
      metadata: {},
      created_at: "2026-06-02T08:00:00.000Z",
    };
    const toolCall = {
      id: "tool-1",
      owner_id: ownerId,
      project_id: projectId,
      thread_id: threadId,
      run_id: runId,
      tool_name: "Script Builder",
      command: "script",
      status: "completed",
      input: { prompt: "Make a launch reel." },
      output: { kind: "script_package" },
      requires_approval: false,
      created_at: "2026-06-02T08:04:00.000Z",
      completed_at: "2026-06-02T08:04:05.000Z",
    };
    const supabase = createTimelineSupabase({
      agent_project_patches: [],
      agent_project_patch_operations: [],
      project_artifacts: [
        {
          id: "artifact-route-1",
          owner_id: ownerId,
          project_id: projectId,
          thread_id: threadId,
          artifact_type: "script_package",
          title: "Route artifact",
          payload: { summary: "Saved route artifact." },
          metadata: {},
          created_at: "2026-06-02T08:02:00.000Z",
          updated_at: "2026-06-02T08:02:00.000Z",
        },
      ],
      agent_run_summaries: [],
    });
    createSupabaseServerClient.mockResolvedValue(supabase.client);
    getAgentHistory.mockResolvedValue({
      thread: { id: threadId },
      messages: [message],
      toolCalls: [toolCall],
    });

    const { GET } = await import("@/app/api/projects/[id]/agent/route");
    const response = await GET(
      new Request(`http://localhost/api/projects/${projectId}/agent?threadId=${threadId}`),
      { params: Promise.resolve({ id: projectId }) },
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.threadId).toBe(threadId);
    expect(payload.messages).toEqual([message]);
    expect(payload.toolCalls).toEqual([toolCall]);
    expect(payload.entries.map((entry: { type: string }) => entry.type)).toEqual([
      "message",
      "artifact",
      "tool",
    ]);
    expect(payload.entries[0]).toMatchObject({
      type: "message",
      kind: "message",
      messageId: "message-1",
      content: "Make a launch reel.",
    });
    expect(payload.entries[2]).toMatchObject({
      type: "tool",
      kind: "tool",
      toolCallId: "tool-1",
      toolName: "Script Builder",
      status: "completed",
    });
  });
});
