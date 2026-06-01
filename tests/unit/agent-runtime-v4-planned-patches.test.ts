import { beforeEach, describe, expect, test, vi } from "vitest";

import type { ModelGateway } from "@/lib/ai/model-gateway";
import type { ProjectMindSnapshot } from "@/lib/agent/runtime-v4/memory/memory-types";
import { SupabasePatchAuditStore } from "@/lib/agent/runtime-v4/patch/patch-executor";
import type { ProjectPatch } from "@/lib/agent/runtime-v4/patch/project-patch";
import { WorkflowExecutor } from "@/lib/agent/runtime-v4/workflows/workflow-executor";

const createSupabaseServerClient = vi.hoisted(() => vi.fn());
const createRuntimeV4ToolRegistry = vi.hoisted(() => vi.fn(() => ({ id: "registry" })));
const toolExecute = vi.hoisted(() => vi.fn());
const ToolExecutor = vi.hoisted(() =>
  vi.fn(function ToolExecutor() {
    return { execute: toolExecute };
  }),
);

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

vi.mock("@/lib/agent/runtime-v4/tools/registry", () => ({
  createRuntimeV4ToolRegistry,
}));

vi.mock("@/lib/agent/runtime-v4/tools/executor", () => ({
  ToolExecutor,
}));

const context = {
  userId: "11111111-1111-4111-8111-111111111111",
  projectId: "22222222-2222-4222-8222-222222222222",
  threadId: "33333333-3333-4333-8333-333333333333",
  runId: "44444444-4444-4444-8444-444444444444",
  source: "agent",
};

const storedPatchId = "55555555-5555-4555-8555-555555555555";

const storedPatch: ProjectPatch = {
  id: storedPatchId,
  title: "Stored creative brief patch",
  summary: "Persist the stored patch.",
  riskLevel: "low",
  requiresApproval: false,
  operations: [
    {
      type: "update_creative_brief",
      input: {
        tone: "stored tone",
      },
    },
  ],
};

const clientSuppliedPatch: ProjectPatch = {
  id: "66666666-6666-4666-8666-666666666666",
  title: "Client supplied patch",
  summary: "This request body patch must not execute.",
  riskLevel: "low",
  requiresApproval: false,
  operations: [
    {
      type: "record_project_memory",
      input: {
        memoryType: "creative_direction",
        content: "client body should be ignored",
      },
    },
  ],
};

type SupabaseMockOptions = {
  userId?: string | null;
  projectRow?: Record<string, unknown> | null;
  patchRow?: Record<string, unknown> | null;
  upsertErrors?: Record<string, Error>;
  updateErrors?: Record<string, Error>;
  upsertErrorForPayload?: (table: string, payload: Record<string, unknown>) => Error | null | undefined;
  updateErrorForPayload?: (table: string, payload: Record<string, unknown>) => Error | null | undefined;
};

function createSupabaseMock(options: SupabaseMockOptions = {}) {
  const calls = {
    upserts: [] as Array<{ table: string; payload: Record<string, unknown>; options?: unknown }>,
    updates: [] as Array<{ table: string; payload: Record<string, unknown>; filters: Record<string, unknown> }>,
  };

  const projectRow = options.projectRow === undefined
    ? { id: context.projectId, owner_id: options.userId ?? context.userId }
    : options.projectRow;
  const patchRow = options.patchRow === undefined
    ? {
        id: storedPatchId,
        owner_id: options.userId ?? context.userId,
        project_id: context.projectId,
        thread_id: context.threadId,
        run_id: context.runId,
        status: "planned",
        patch: storedPatch,
        metadata: { plannedBy: "runtime-v4-workflow" },
      }
    : options.patchRow;

  const matches = (row: Record<string, unknown> | null, filters: Record<string, unknown>) =>
    Boolean(row) && Object.entries(filters).every(([key, value]) => row?.[key] === value);

  return {
    calls,
    client: {
      auth: {
        getUser: vi.fn(async () => ({
          data: {
            user: options.userId === null
              ? null
              : { id: options.userId ?? context.userId },
          },
        })),
      },
      from: vi.fn((table: string) => ({
        select: vi.fn(() => {
          const filters: Record<string, unknown> = {};
          const chain = {
            eq: vi.fn((column: string, value: unknown) => {
              filters[column] = value;
              return chain;
            }),
            maybeSingle: vi.fn(async () => {
              if (table === "content_cards") {
                return {
                  data: matches(projectRow, filters) ? projectRow : null,
                  error: null,
                };
              }

              if (table === "agent_project_patches") {
                return {
                  data: matches(patchRow, filters) ? patchRow : null,
                  error: null,
                };
              }

              return { data: null, error: null };
            }),
          };
          return chain;
        }),
        upsert: vi.fn(async (payload: Record<string, unknown>, upsertOptions?: unknown) => {
          calls.upserts.push({ table, payload, options: upsertOptions });
          return {
            data: null,
            error: options.upsertErrorForPayload?.(table, payload) ?? options.upsertErrors?.[table] ?? null,
          };
        }),
        update: vi.fn((payload: Record<string, unknown>) => {
          const filters: Record<string, unknown> = {};
          const chain = {
            eq: vi.fn(async (column: string, value: unknown) => {
              filters[column] = value;
              calls.updates.push({ table, payload, filters: { ...filters } });
              return {
                data: null,
                error: options.updateErrorForPayload?.(table, payload) ?? options.updateErrors?.[table] ?? null,
              };
            }),
          };
          return chain;
        }),
      })),
    },
  };
}

function projectMind(title = "Composting for city balconies"): ProjectMindSnapshot {
  return {
    project: {
      id: context.projectId,
      ownerId: context.userId,
      title,
      status: "idea",
      format: "reel",
      platform: "instagram",
      topicTags: ["home", "sustainability"],
      experimentTags: [],
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    },
    creativeBrief: {
      audience: "apartment gardeners",
      platform: "instagram",
      format: "reel",
      tone: "warm and practical",
      coreAngle: `Make ${title} feel easy for beginners.`,
      viewerPromise: "Know the first tiny step to try.",
      visualStyle: "bright kitchen counter demos",
      cta: "Save this for your first setup.",
      openQuestions: [],
    },
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
    assets: { count: 0, folders: [], looseAssetCount: 0, recent: [] },
    assetLibrary: { count: 0, folders: [], looseAssetCount: 0, recent: [] },
    selectedOutputs: [],
    rejectedOutputs: [],
    durableProjectMemories: [],
    recentRunSummaries: [],
    integrationState: { available: false, connections: [], note: "External integrations are not wired in Agent v4 yet." },
    editor: { ready: false, integrationAvailable: false, note: "" },
    publish: { ready: false, integrationAvailable: false, caption: null },
    analytics: null,
    conversation: { recentMessages: [] },
    toolHistory: [],
    memory: [],
    readiness: {
      briefCompleteness: 80,
      scriptCompleteness: 0,
      assetReadiness: 0,
      shootReadiness: 0,
      editorReadiness: 0,
      publishReadiness: 0,
      nextLikelyStage: "scripting",
      missing: ["script", "assets", "shoot pack"],
    },
  };
}

function failingGateway(): ModelGateway {
  return {
    generateStructured: vi.fn(async () => {
      throw new Error("model unavailable");
    }),
    generateText: vi.fn(),
    streamText: vi.fn(),
  } as unknown as ModelGateway;
}

describe("runtime-v4 planned workflow patches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSupabaseServerClient.mockReset();
    toolExecute.mockResolvedValue({
      toolName: "update_creative_brief",
      status: "completed",
      output: { kind: "creative_brief_update", changedFields: ["tone"] },
      startedAt: "2026-06-02T00:00:00.000Z",
      completedAt: "2026-06-02T00:00:01.000Z",
    });
  });

  test("planned full production package patch is persisted when auto-apply is skipped", async () => {
    const supabase = createSupabaseMock();
    createSupabaseServerClient.mockResolvedValue(supabase.client);

    const patchExecutor = {
      apply: vi.fn(),
    };
    const executor = new WorkflowExecutor({
      patchExecutor,
      plannedPatchStore: new SupabasePatchAuditStore(),
      modelGateway: failingGateway(),
    });

    const result = await executor.execute({
      workflowName: "create_full_production_package",
      input: { prompt: "Make the complete production package" },
      projectMind: projectMind(),
      context,
    });

    expect(patchExecutor.apply).not.toHaveBeenCalled();
    expect(result.patchResult).toBeUndefined();
    expect(result.observation.output).toMatchObject({
      patchAutoApplySkipped: true,
      patchPlanned: true,
      patchTitle: "Save full production package",
      patchOperationCount: 9,
    });
    expect(result.observation.output?.patchId).toEqual(expect.any(String));

    const patchUpsert = supabase.calls.upserts.find((call) => call.table === "agent_project_patches");
    expect(patchUpsert?.payload).toMatchObject({
      id: result.observation.output?.patchId,
      owner_id: context.userId,
      project_id: context.projectId,
      thread_id: context.threadId,
      run_id: context.runId,
      title: "Save full production package",
      status: "planned",
      requires_approval: false,
      successful_operations: 0,
      failed_operations: 0,
      retryable: false,
    });
    expect(patchUpsert?.payload.patch).toMatchObject({
      id: result.observation.output?.patchId,
      title: "Save full production package",
      operations: expect.arrayContaining([
        expect.objectContaining({ type: "record_project_memory" }),
      ]),
    });
    expect(patchUpsert?.payload.metadata).toMatchObject({
      plannedBy: "runtime-v4-workflow",
      autoApplySkipped: true,
      autoApplyReason: expect.stringContaining("auto-apply limit"),
      operationCount: 9,
    });
    expect(patchUpsert?.payload.patch).toMatchObject({
      metadata: expect.objectContaining({
        plannedBy: "runtime-v4-workflow",
      }),
    });
  });

  test("skipped auto-apply without a planned patch store does not report a planned patch without an id", async () => {
    const patchExecutor = {
      apply: vi.fn(),
    };
    const executor = new WorkflowExecutor({
      patchExecutor,
      modelGateway: failingGateway(),
    });

    const result = await executor.execute({
      workflowName: "create_full_production_package",
      input: { prompt: "Make the complete production package" },
      projectMind: projectMind(),
      context,
    });

    expect(patchExecutor.apply).not.toHaveBeenCalled();
    expect(result.workflowResult.status).toBe("failed");
    expect(result.observation).toMatchObject({
      toolName: "create_full_production_package",
      status: "blocked",
      output: {
        kind: "creative_workflow_failed",
        error: {
          code: "WORKFLOW_PATCH_PERSISTENCE_FAILED",
        },
      },
    });
    expect(result.observation.output).not.toMatchObject({
      patchAutoApplySkipped: true,
      patchPlanned: true,
    });
    expect(result.observation.output?.patchId).toBeUndefined();
  });

  test("planned patch upsert errors fail closed without reporting a patch id", async () => {
    const supabase = createSupabaseMock({
      upsertErrors: {
        agent_project_patches: new Error("planned patch insert failed"),
      },
    });
    createSupabaseServerClient.mockResolvedValue(supabase.client);

    const patchExecutor = {
      apply: vi.fn(),
    };
    const executor = new WorkflowExecutor({
      patchExecutor,
      plannedPatchStore: new SupabasePatchAuditStore(),
      modelGateway: failingGateway(),
    });

    const result = await executor.execute({
      workflowName: "create_full_production_package",
      input: { prompt: "Make the complete production package" },
      projectMind: projectMind(),
      context,
    });

    expect(patchExecutor.apply).not.toHaveBeenCalled();
    expect(result.workflowResult.status).toBe("failed");
    expect(result.observation).toMatchObject({
      status: "blocked",
      output: {
        kind: "creative_workflow_failed",
        error: {
          code: "WORKFLOW_PATCH_PERSISTENCE_FAILED",
          message: "planned patch insert failed",
        },
      },
    });
    expect(result.observation.output?.patchId).toBeUndefined();
    expect(result.observation.output).not.toMatchObject({
      patchAutoApplySkipped: true,
      patchPlanned: true,
    });
    expect(result.events.map((event) => event.type)).not.toContain("workflow_patch_planned");
  });

  test("apply endpoint ignores client-supplied patch JSON and executes the stored patch", async () => {
    const supabase = createSupabaseMock();
    createSupabaseServerClient.mockResolvedValue(supabase.client);

    const { POST } = await import("@/app/api/projects/[id]/agent/patches/[patchId]/apply/route");
    const response = await POST(
      new Request(`http://localhost/api/projects/${context.projectId}/agent/patches/${storedPatchId}/apply`, {
        method: "POST",
        body: JSON.stringify({ patch: clientSuppliedPatch }),
      }),
      { params: Promise.resolve({ id: context.projectId, patchId: storedPatchId }) },
    );

    expect(response.status).toBe(200);
    expect(toolExecute).toHaveBeenCalledTimes(1);
    expect(toolExecute).toHaveBeenCalledWith(expect.objectContaining({
      toolName: "update_creative_brief",
      input: { tone: "stored tone" },
      context: expect.objectContaining({
        userId: context.userId,
        projectId: context.projectId,
      }),
    }));
    expect(JSON.stringify(toolExecute.mock.calls)).not.toContain("client body should be ignored");

    const body = await response.json();
    expect(body).toMatchObject({
      patchId: storedPatchId,
      status: "completed",
      operations: [
        {
          operationIndex: 0,
          type: "update_creative_brief",
          status: "completed",
        },
      ],
    });
  });

  test("apply endpoint rejects a stored patch whose id does not match the row", async () => {
    const supabase = createSupabaseMock({
      patchRow: {
        id: storedPatchId,
        owner_id: context.userId,
        project_id: context.projectId,
        thread_id: context.threadId,
        run_id: context.runId,
        status: "planned",
        patch: {
          ...storedPatch,
          id: "88888888-8888-4888-8888-888888888888",
        },
        metadata: { plannedBy: "runtime-v4-workflow" },
      },
    });
    createSupabaseServerClient.mockResolvedValue(supabase.client);

    const { POST } = await import("@/app/api/projects/[id]/agent/patches/[patchId]/apply/route");
    const response = await POST(
      new Request(`http://localhost/api/projects/${context.projectId}/agent/patches/${storedPatchId}/apply`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: context.projectId, patchId: storedPatchId }) },
    );

    expect(response.status).toBe(409);
    expect(toolExecute).not.toHaveBeenCalled();
  });

  test("apply endpoint rejects completed patch replay", async () => {
    const supabase = createSupabaseMock({
      patchRow: {
        id: storedPatchId,
        owner_id: context.userId,
        project_id: context.projectId,
        thread_id: context.threadId,
        run_id: context.runId,
        status: "completed",
        patch: storedPatch,
        metadata: { plannedBy: "runtime-v4-workflow" },
      },
    });
    createSupabaseServerClient.mockResolvedValue(supabase.client);

    const { POST } = await import("@/app/api/projects/[id]/agent/patches/[patchId]/apply/route");
    const response = await POST(
      new Request(`http://localhost/api/projects/${context.projectId}/agent/patches/${storedPatchId}/apply`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: context.projectId, patchId: storedPatchId }) },
    );

    expect(response.status).toBe(409);
    expect(toolExecute).not.toHaveBeenCalled();
  });

  test("apply endpoint rejects rows missing the runtime planned marker", async () => {
    const supabase = createSupabaseMock({
      patchRow: {
        id: storedPatchId,
        owner_id: context.userId,
        project_id: context.projectId,
        thread_id: context.threadId,
        run_id: context.runId,
        status: "planned",
        patch: storedPatch,
        metadata: {},
      },
    });
    createSupabaseServerClient.mockResolvedValue(supabase.client);

    const { POST } = await import("@/app/api/projects/[id]/agent/patches/[patchId]/apply/route");
    const response = await POST(
      new Request(`http://localhost/api/projects/${context.projectId}/agent/patches/${storedPatchId}/apply`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: context.projectId, patchId: storedPatchId }) },
    );

    expect(response.status).toBe(409);
    expect(toolExecute).not.toHaveBeenCalled();
  });

  test("apply endpoint executes stored patch only and records operation results", async () => {
    const supabase = createSupabaseMock();
    createSupabaseServerClient.mockResolvedValue(supabase.client);

    const { POST } = await import("@/app/api/projects/[id]/agent/patches/[patchId]/apply/route");
    const response = await POST(
      new Request(`http://localhost/api/projects/${context.projectId}/agent/patches/${storedPatchId}/apply`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: context.projectId, patchId: storedPatchId }) },
    );

    expect(response.status).toBe(200);
    expect(toolExecute).toHaveBeenCalledTimes(1);
    expect(supabase.calls.upserts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        table: "agent_project_patch_operations",
        payload: expect.objectContaining({
          patch_id: storedPatchId,
          operation_index: 0,
          operation_type: "update_creative_brief",
          status: "completed",
        }),
      }),
    ]));
  });

  test("required-audit apply writes a running operation placeholder before executing", async () => {
    const supabase = createSupabaseMock();
    createSupabaseServerClient.mockResolvedValue(supabase.client);
    toolExecute.mockImplementationOnce(async ({ toolName }) => {
      expect(supabase.calls.upserts).toEqual(expect.arrayContaining([
        expect.objectContaining({
          table: "agent_project_patch_operations",
          payload: expect.objectContaining({
            patch_id: storedPatchId,
            operation_index: 0,
            status: "running",
          }),
        }),
      ]));

      return {
        toolName,
        status: "completed",
        output: { kind: "creative_brief_update", changedFields: ["tone"] },
        startedAt: "2026-06-02T00:00:00.000Z",
        completedAt: "2026-06-02T00:00:01.000Z",
      };
    });

    const { POST } = await import("@/app/api/projects/[id]/agent/patches/[patchId]/apply/route");
    const response = await POST(
      new Request(`http://localhost/api/projects/${context.projectId}/agent/patches/${storedPatchId}/apply`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: context.projectId, patchId: storedPatchId }) },
    );

    expect(response.status).toBe(200);
    const operationStatuses = supabase.calls.upserts
      .filter((call) => call.table === "agent_project_patch_operations")
      .map((call) => call.payload.status);
    expect(operationStatuses).toEqual(["running", "completed"]);
  });

  test("apply endpoint returns failure when operation audit recording fails", async () => {
    const supabase = createSupabaseMock({
      upsertErrorForPayload: (table, payload) => {
        if (table === "agent_project_patch_operations" && payload.status === "completed") {
          return new Error("operation audit insert failed");
        }

        return null;
      },
    });
    createSupabaseServerClient.mockResolvedValue(supabase.client);

    const { POST } = await import("@/app/api/projects/[id]/agent/patches/[patchId]/apply/route");
    const response = await POST(
      new Request(`http://localhost/api/projects/${context.projectId}/agent/patches/${storedPatchId}/apply`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: context.projectId, patchId: storedPatchId }) },
    );

    expect(response.status).toBe(500);
    expect(toolExecute).toHaveBeenCalledTimes(1);
    const body = await response.json();
    expect(body).toMatchObject({
      error: "operation audit insert failed",
    });
  });

  test("non-owner cannot apply a planned patch", async () => {
    const supabase = createSupabaseMock({
      userId: "77777777-7777-4777-8777-777777777777",
      projectRow: null,
      patchRow: {
        id: storedPatchId,
        owner_id: context.userId,
        project_id: context.projectId,
        thread_id: context.threadId,
        run_id: context.runId,
        patch: storedPatch,
      },
    });
    createSupabaseServerClient.mockResolvedValue(supabase.client);

    const { POST } = await import("@/app/api/projects/[id]/agent/patches/[patchId]/apply/route");
    const response = await POST(
      new Request(`http://localhost/api/projects/${context.projectId}/agent/patches/${storedPatchId}/apply`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: context.projectId, patchId: storedPatchId }) },
    );

    expect(response.status).toBe(404);
    expect(toolExecute).not.toHaveBeenCalled();
    expect(supabase.calls.upserts).toEqual([]);
  });
});
