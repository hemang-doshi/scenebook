import { beforeEach, describe, expect, test, vi } from "vitest";

import { buildProjectMind } from "@/lib/agent/runtime-v4/memory/project-mind";
import { saveRunSummary } from "@/lib/agent/runtime-v4/memory/run-summary-store";
import type {
  ProjectMemoryRecord,
  ProjectMemoryType,
  ProjectMindStores,
  ProjectRunSummary,
} from "@/lib/agent/runtime-v4/memory/memory-types";

const { createSupabaseServerClient } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

function baseProject() {
  return {
    id: "project-1",
    ownerId: "user-1",
    inboxItemId: null,
    title: "Bronze watch hero reel",
    status: "idea" as const,
    format: "reel" as const,
    platform: "instagram" as const,
    topicTags: ["watch"],
    experimentTags: ["macro"],
    scriptLab: {
      angle: "Luxury detail macro.",
      hook: "The clasp tells you everything.",
      outline: "Hook, detail, payoff.",
      script: "Show the clasp and explain why it matters.",
      caption: "A tiny detail that changes the whole watch.",
      onScreenText: "Check the clasp",
      cta: "Save this before your next watch purchase.",
      notes: "",
    },
    shootPack: {
      aRoll: [{ id: "ar-1", label: "Deliver intro", done: true }],
      bRoll: [],
      screenCaptures: [],
      props: [],
      missingAssets: [],
      locationNotes: "Desk macro setup.",
      visualNotes: "Warm rim light.",
    },
    analyticsJournal: {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      watchTimeNote: "",
      reflection: "",
      decision: "repeat" as const,
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
    updatedAt: "2026-06-01T00:30:00.000Z",
  };
}

function memory(overrides: Partial<ProjectMemoryRecord> & { memoryType: ProjectMemoryType }): ProjectMemoryRecord {
  const { memoryType, ...rest } = overrides;
  return {
    id: overrides.id ?? `memory-${overrides.memoryType}`,
    ownerId: "user-1",
    projectId: "project-1",
    threadId: "thread-1",
    runId: "run-1",
    toolCallId: null,
    memoryType,
    summary: overrides.summary ?? "Memory summary",
    content: overrides.content ?? {},
    source: "agent",
    confidence: 1,
    userApproved: false,
    supersedesMemoryId: null,
    status: "active",
    createdAt: "2026-06-01T01:00:00.000Z",
    updatedAt: "2026-06-01T01:00:00.000Z",
    ...rest,
  };
}

function runSummary(overrides: Partial<ProjectRunSummary> = {}): ProjectRunSummary {
  return {
    id: "summary-1",
    ownerId: "user-1",
    projectId: "project-1",
    threadId: "thread-1",
    runId: "run-1",
    userGoal: "Write a script",
    summary: "Script was saved.",
    actionsTaken: ["generate_script_package: Script package generated."],
    workspaceChanges: [],
    selectedOutputs: [],
    rejectedOutputs: [],
    openNextSteps: ["Plan supporting assets"],
    metadata: {},
    createdAt: "2026-06-01T01:05:00.000Z",
    ...overrides,
  };
}

function stores(input: {
  memories?: ProjectMemoryRecord[];
  runSummaries?: ProjectRunSummary[];
} = {}): ProjectMindStores {
  return {
    getProjectWorkspace: vi.fn(async () => baseProject()),
    getAgentHistory: vi.fn(async () => ({
      thread: { id: "thread-1" },
      messages: [{ role: "user", content: "write a script", created_at: "2026-06-01T00:40:00.000Z" }],
      toolCalls: [{ id: "tool-1", tool_name: "update_script_lab", status: "completed", command: null }],
    })),
    getProjectAssetLibrary: vi.fn(async () => ({
      folders: [
        {
          id: "folder-1",
          name: "Hero stills",
          assets: [{ id: "asset-1", title: "Clasp macro", type: "image" as const, url: "https://example.com/clasp.png" }],
        },
      ],
      looseAssets: [],
    })),
    loadCreativeBrief: vi.fn(async () => ({
      audience: "watch collectors",
      platform: "instagram",
      format: "reel",
      tone: "premium",
      coreAngle: "Tiny build details reveal quality.",
      viewerPromise: "Know what to check before buying.",
      visualStyle: "warm macro product",
      cta: "Save this before buying.",
      openQuestions: [],
    })),
    loadActiveGoal: vi.fn(async () => ({
      id: "goal-1",
      title: "Ship the hero reel",
      status: "active" as const,
      stage: "scripting" as const,
      completedSteps: ["brief"],
      nextActions: ["Plan supporting assets"],
      blockers: [],
      metadata: {},
    })),
    listScriptVersions: vi.fn(async () => [
      { id: "version-1", title: "Draft 1", active: true, createdAt: "2026-06-01T00:50:00.000Z" },
    ]),
    listProjectMemories: vi.fn(async () => input.memories ?? []),
    listRecentRunSummaries: vi.fn(async () => input.runSummaries ?? []),
  };
}

describe("runtime-v4 ProjectMind", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("builds a canonical snapshot from mocked stores", async () => {
    const snapshot = await buildProjectMind({
      projectId: "project-1",
      threadId: "thread-1",
      stores: stores({
        memories: [
          memory({
            memoryType: "creative_direction",
            summary: "Keep the watch language tactile and premium.",
            content: { field: "tone" },
          }),
        ],
        runSummaries: [runSummary()],
      }),
    });

    expect(snapshot.project).toMatchObject({
      id: "project-1",
      ownerId: "user-1",
      title: "Bronze watch hero reel",
      topicTags: ["watch"],
    });
    expect(snapshot.creativeBrief).toMatchObject({ audience: "watch collectors" });
    expect(snapshot.activeGoal).toMatchObject({ title: "Ship the hero reel" });
    expect(snapshot.scriptLab.hook).toContain("clasp");
    expect(snapshot.scriptVersions[0]).toMatchObject({ id: "version-1", active: true });
    expect(snapshot.shootPack.aRoll).toHaveLength(1);
    expect(snapshot.assetLibrary).toMatchObject({ count: 1, folders: [{ name: "Hero stills", assetCount: 1 }] });
    expect(snapshot.durableProjectMemories[0].summary).toContain("premium");
    expect(snapshot.recentRunSummaries[0].openNextSteps).toContain("Plan supporting assets");
    expect(snapshot.integrationState).toMatchObject({ available: false, connections: [] });
  });

  test("selected output is present in the next snapshot", async () => {
    const snapshot = await buildProjectMind({
      projectId: "project-1",
      threadId: "thread-1",
      stores: stores({
        memories: [
          memory({
            memoryType: "selected_output",
            summary: "Use the clasp macro as the hero still.",
            content: { outputType: "image", outputId: "asset-1", title: "Clasp macro" },
          }),
        ],
      }),
    });

    expect(snapshot.selectedOutputs).toHaveLength(1);
    expect(snapshot.selectedOutputs[0]).toMatchObject({
      outputType: "image",
      outputId: "asset-1",
      title: "Clasp macro",
    });
  });

  test("rejected output is present in the next snapshot", async () => {
    const snapshot = await buildProjectMind({
      projectId: "project-1",
      threadId: "thread-1",
      stores: stores({
        memories: [
          memory({
            memoryType: "rejected_output",
            summary: "Reject the blue neon thumbnail direction.",
            content: { outputType: "thumbnail", outputId: "asset-2", title: "Blue neon thumbnail" },
          }),
        ],
      }),
    });

    expect(snapshot.rejectedOutputs).toHaveLength(1);
    expect(snapshot.rejectedOutputs[0]).toMatchObject({
      outputType: "thumbnail",
      outputId: "asset-2",
      title: "Blue neon thumbnail",
    });
  });

  test("run summary writer saves summary memory and selected and rejected outputs", async () => {
    const runSummaryUpserts: Array<Record<string, unknown>> = [];
    const memoryInserts: Array<Record<string, unknown>> = [];
    const client = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: "user-1" } } })),
      },
      from: vi.fn((table: string) => {
        if (table === "agent_run_summaries") {
          return {
            upsert(payload: Record<string, unknown>) {
              runSummaryUpserts.push(payload);
              return {
                select: () => ({
                  single: async () => ({
                    data: {
                      id: "summary-1",
                      created_at: "2026-06-01T01:00:00.000Z",
                      ...payload,
                    },
                    error: null,
                  }),
                }),
              };
            },
          };
        }

        if (table === "project_memory_entries") {
          return {
            insert(payload: Record<string, unknown>) {
              memoryInserts.push(payload);
              return {
                select: () => ({
                  single: async () => ({
                    data: {
                      id: `memory-${memoryInserts.length}`,
                      status: "active",
                      created_at: "2026-06-01T01:00:00.000Z",
                      updated_at: "2026-06-01T01:00:00.000Z",
                      ...payload,
                    },
                    error: null,
                  }),
                }),
              };
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };
    createSupabaseServerClient.mockResolvedValue(client);

    const result = await saveRunSummary({
      projectId: "project-1",
      threadId: "thread-1",
      runId: "run-1",
      userGoal: "Pick the best thumbnail",
      actionsTaken: ["create_project_artifact: Project artifact created."],
      workspaceChanges: [{ kind: "project_artifact", title: "Thumbnail options" }],
      selectedOutputs: [{ outputType: "thumbnail", outputId: "asset-1", title: "Warm macro", summary: "Selected warm macro thumbnail." }],
      rejectedOutputs: [{ outputType: "thumbnail", outputId: "asset-2", title: "Blue neon", summary: "Rejected blue neon thumbnail." }],
      openNextSteps: ["Generate final cover frame"],
    });

    expect(result).toMatchObject({ id: "summary-1", userGoal: "Pick the best thumbnail" });
    expect(runSummaryUpserts[0]).toMatchObject({
      owner_id: "user-1",
      project_id: "project-1",
      run_id: "run-1",
    });
    expect(runSummaryUpserts[0].selected_outputs).toEqual([
      expect.objectContaining({ outputId: "asset-1", title: "Warm macro" }),
    ]);
    expect(runSummaryUpserts[0].rejected_outputs).toEqual([
      expect.objectContaining({ outputId: "asset-2", title: "Blue neon" }),
    ]);
    expect(memoryInserts.map((entry) => entry.memory_type)).toEqual([
      "agent_summary",
      "selected_output",
      "rejected_output",
    ]);
  });
});
