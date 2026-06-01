import { beforeEach, describe, expect, test, vi } from "vitest";

import { getRuntimeV4Tool } from "@/lib/agent/runtime-v4/tools/registry";
import type { ToolExecutionContext } from "@/lib/agent/runtime-v4/tools/types";

const {
  loadCreativeBrief,
  upsertCreativeBrief,
  loadActiveGoal,
  upsertActiveGoal,
  createScriptVersion,
  loadScriptVersion,
  saveProjectMemory,
  listProjectMemories,
  createSupabaseServerClient,
  getProjectWorkspace,
  updateCard,
  createProjectArtifact,
} = vi.hoisted(() => ({
  loadCreativeBrief: vi.fn(),
  upsertCreativeBrief: vi.fn(),
  loadActiveGoal: vi.fn(),
  upsertActiveGoal: vi.fn(),
  createScriptVersion: vi.fn(),
  loadScriptVersion: vi.fn(),
  saveProjectMemory: vi.fn(),
  listProjectMemories: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getProjectWorkspace: vi.fn(),
  updateCard: vi.fn(),
  createProjectArtifact: vi.fn(),
}));

vi.mock("@/lib/agent/runtime-v3/memory/creative-brief-store", () => ({
  loadCreativeBrief,
  upsertCreativeBrief,
}));

vi.mock("@/lib/agent/runtime-v3/memory/goal-store", () => ({
  loadActiveGoal,
  upsertActiveGoal,
}));

vi.mock("@/lib/agent/runtime-v3/memory/script-version-store", () => ({
  createScriptVersion,
  loadScriptVersion,
}));

vi.mock("@/lib/agent/runtime-v4/memory/project-mind", () => ({
  listProjectMemories,
  saveProjectMemory,
}));

vi.mock("@/lib/data/repository", () => ({
  getProjectWorkspace,
  updateCard,
}));

vi.mock("@/lib/agent/artifacts", () => ({
  createProjectArtifact,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

const context: ToolExecutionContext = {
  userId: "user-1",
  projectId: "project-1",
  threadId: "thread-1",
  runId: "run-1",
  source: "test",
};

const scriptLab = {
  angle: "",
  hook: "",
  outline: "",
  script: "",
  caption: "",
  onScreenText: "",
  cta: "",
  notes: "",
};

const shootPack = {
  aRoll: [],
  bRoll: [],
  screenCaptures: [],
  props: [],
  missingAssets: [],
  locationNotes: "",
  visualNotes: "",
};

function project(overrides: Record<string, unknown> = {}) {
  return {
    id: "project-1",
    scriptLab,
    shootPack,
    ...overrides,
  };
}

function supabaseSingle(data: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
  };
  const supabase = {
    from: vi.fn(() => query),
  };
  createSupabaseServerClient.mockResolvedValue(supabase);
  return { query, supabase };
}

describe("runtime-v4 workspace tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("update_creative_brief verifies persisted state", async () => {
    const input = {
      tone: "honest founder-devlog",
      coreMessage: "Build the tool I needed.",
      visualStyle: "screen recordings and raw notes",
    };
    const persisted = {
      tone: input.tone,
      coreAngle: input.coreMessage,
      visualStyle: input.visualStyle,
    };
    upsertCreativeBrief.mockResolvedValue(persisted);
    loadCreativeBrief.mockResolvedValue(persisted);
    const tool = getRuntimeV4Tool("update_creative_brief");

    const output = await tool?.handler(input, context);
    const verification = await tool?.verify?.(input, output, context);

    expect(upsertCreativeBrief).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "user-1",
      projectId: "project-1",
      patch: expect.objectContaining({
        tone: input.tone,
        coreAngle: input.coreMessage,
        visualStyle: input.visualStyle,
      }),
    }));
    expect(verification).toMatchObject({
      verified: true,
      actual: expect.objectContaining({ tone: input.tone }),
    });
  });

  test("update_active_goal verifies persisted state", async () => {
    const input = {
      title: "Save launch reel direction",
      status: "active" as const,
      stage: "scripting",
      nextAction: "Write Script v1",
      doneCriteria: ["Direction saved"],
      tasks: [{ title: "Create script", status: "todo" as const }],
    };
    const persisted = {
      id: "goal-1",
      title: input.title,
      status: "active",
      stage: input.stage,
      nextActions: [input.nextAction],
      completedSteps: input.doneCriteria,
      blockers: [],
      metadata: { tasks: input.tasks },
    };
    upsertActiveGoal.mockResolvedValue(persisted);
    loadActiveGoal.mockResolvedValue(persisted);
    const tool = getRuntimeV4Tool("update_active_goal");

    const output = await tool?.handler(input, context);
    const verification = await tool?.verify?.(input, output, context);

    expect(upsertActiveGoal).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "user-1",
      projectId: "project-1",
      threadId: "thread-1",
      goal: expect.objectContaining({
        title: input.title,
        nextActions: [input.nextAction],
      }),
    }));
    expect(verification).toMatchObject({
      verified: true,
      actual: expect.objectContaining({ title: input.title }),
    });
  });

  test("update_active_goal verifies non-active persisted goal by id", async () => {
    const input = {
      title: "Pause launch reel direction",
      status: "paused" as const,
      stage: "scripting",
      nextAction: "Wait for user feedback",
      doneCriteria: ["Direction paused"],
      tasks: [{ title: "Review direction", status: "blocked" as const }],
    };
    const persisted = {
      id: "goal-paused-1",
      title: input.title,
      status: "paused",
      stage: input.stage,
      nextActions: [input.nextAction],
      completedSteps: input.doneCriteria,
      blockers: [],
      metadata: { tasks: input.tasks },
    };
    const eq = vi.fn(() => query);
    const query = {
      select: vi.fn(() => query),
      eq,
      maybeSingle: vi.fn(async () => ({
        data: {
          id: persisted.id,
          title: persisted.title,
          status: persisted.status,
          stage: persisted.stage,
          next_actions: persisted.nextActions,
          completed_steps: persisted.completedSteps,
          blockers: persisted.blockers,
          metadata: persisted.metadata,
        },
        error: null,
      })),
    };
    const supabase = {
      from: vi.fn(() => query),
    };
    createSupabaseServerClient.mockResolvedValue(supabase);
    loadActiveGoal.mockResolvedValueOnce(null);
    upsertActiveGoal.mockResolvedValue(persisted);
    const tool = getRuntimeV4Tool("update_active_goal");

    const output = await tool?.handler(input, context);
    const verification = await tool?.verify?.(input, output, context);

    expect(supabase.from).toHaveBeenCalledWith("agent_goals");
    expect(eq).toHaveBeenCalledWith("project_id", "project-1");
    expect(eq).toHaveBeenCalledWith("id", "goal-paused-1");
    expect(eq).toHaveBeenCalledWith("status", "paused");
    expect(verification).toMatchObject({
      verified: true,
      actual: expect.objectContaining({
        id: "goal-paused-1",
        status: "paused",
        title: input.title,
      }),
    });
  });

  test("update_active_goal verification rejects mismatched blockers", async () => {
    const input = {
      title: "Save launch reel direction",
      status: "active" as const,
      stage: "scripting",
      nextAction: "Wait for approval",
      doneCriteria: ["Approval received"],
      blockers: ["Need founder approval"],
    };
    const persisted = {
      id: "goal-blockers-1",
      title: input.title,
      status: "active",
      stage: input.stage,
      nextActions: [input.nextAction],
      completedSteps: input.doneCriteria,
      blockers: [],
      metadata: {},
    };
    loadActiveGoal
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(persisted);
    upsertActiveGoal.mockResolvedValue({
      ...persisted,
      blockers: input.blockers,
    });
    const tool = getRuntimeV4Tool("update_active_goal");

    const output = await tool?.handler(input, context);
    const verification = await tool?.verify?.(input, output, context);

    expect(verification).toMatchObject({
      verified: false,
    });
  });

  test("update_active_goal verification honors nextActions alias precedence", async () => {
    const input = {
      title: "Save launch reel direction",
      status: "active" as const,
      stage: "scripting",
      nextAction: "This single action should not win",
      nextActions: ["Use the explicit actions array"],
    };
    const persisted = {
      id: "goal-next-actions-1",
      title: input.title,
      status: "active",
      stage: input.stage,
      nextActions: input.nextActions,
      completedSteps: [],
      blockers: [],
      metadata: {},
    };
    loadActiveGoal
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(persisted);
    upsertActiveGoal.mockResolvedValue(persisted);
    const tool = getRuntimeV4Tool("update_active_goal");

    const output = await tool?.handler(input, context);
    const verification = await tool?.verify?.(input, output, context);

    expect(upsertActiveGoal).toHaveBeenCalledWith(expect.objectContaining({
      goal: expect.objectContaining({
        nextActions: input.nextActions,
      }),
    }));
    expect(verification).toMatchObject({
      verified: true,
    });
  });

  test("update_active_goal verification honors doneCriteria alias precedence", async () => {
    const input = {
      title: "Save launch reel direction",
      status: "active" as const,
      stage: "scripting",
      doneCriteria: ["Use done criteria"],
      completedSteps: ["This completedSteps alias should not win"],
    };
    const persisted = {
      id: "goal-done-criteria-1",
      title: input.title,
      status: "active",
      stage: input.stage,
      nextActions: [],
      completedSteps: input.doneCriteria,
      blockers: [],
      metadata: {},
    };
    loadActiveGoal
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(persisted);
    upsertActiveGoal.mockResolvedValue(persisted);
    const tool = getRuntimeV4Tool("update_active_goal");

    const output = await tool?.handler(input, context);
    const verification = await tool?.verify?.(input, output, context);

    expect(upsertActiveGoal).toHaveBeenCalledWith(expect.objectContaining({
      goal: expect.objectContaining({
        completedSteps: input.doneCriteria,
      }),
    }));
    expect(verification).toMatchObject({
      verified: true,
    });
  });

  test("create_script_version verifies persisted state", async () => {
    const input = {
      title: "Script v1",
      script: "This is the script.",
      selectedHook: "I built the tool I needed.",
      status: "final" as const,
    };
    createScriptVersion.mockResolvedValue({
      id: "script-version-1",
      title: input.title,
      active: true,
      scriptLab: {
        angle: "",
        script: input.script,
        hook: input.selectedHook,
        outline: "",
        caption: "",
        onScreenText: "",
        cta: "",
        notes: "",
      },
      metadata: {
        status: input.status,
      },
    });
    loadScriptVersion.mockResolvedValue({
      id: "script-version-1",
      title: input.title,
      active: true,
      scriptLab: {
        angle: "",
        script: input.script,
        hook: input.selectedHook,
        outline: "",
        caption: "",
        onScreenText: "",
        cta: "",
        notes: "",
      },
      metadata: {
        status: input.status,
      },
    });
    const tool = getRuntimeV4Tool("create_script_version");

    const output = await tool?.handler(input, context);
    const verification = await tool?.verify?.(input, output, context);

    expect(createScriptVersion).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "user-1",
      projectId: "project-1",
      title: input.title,
      active: true,
      scriptLab: expect.objectContaining({
        script: input.script,
        hook: input.selectedHook,
      }),
    }));
    expect(verification).toMatchObject({
      verified: true,
      actual: expect.objectContaining({ title: input.title }),
    });
  });

  test("update_script_lab updates and verifies persisted fields", async () => {
    const input = {
      hook: "SceneBook keeps the idea alive.",
      script: "Open on the messy notes, then show the workspace saving the thread.",
    };
    const persistedScriptLab = {
      ...scriptLab,
      ...input,
    };
    getProjectWorkspace
      .mockResolvedValueOnce(project())
      .mockResolvedValueOnce(project({ scriptLab: persistedScriptLab }));
    updateCard.mockResolvedValue(project({ scriptLab: persistedScriptLab }));
    const tool = getRuntimeV4Tool("update_script_lab");

    const output = await tool?.handler(input, context);
    const verification = await tool?.verify?.(input, output, context);

    expect(updateCard).toHaveBeenCalledWith("project-1", {
      scriptLab: persistedScriptLab,
    });
    expect(verification).toMatchObject({
      verified: true,
      actual: expect.objectContaining(input),
    });
  });

  test("update_shoot_pack verification rejects matching labels with wrong object state", async () => {
    const input = {
      scenes: [{ label: "Film desk reset", category: "aRoll" as const, done: true }],
      assets: [{ label: "Before frame", category: "props" as const, done: true }],
      visualDirection: "Raw screen recording plus handheld inserts.",
    };
    const persistedShootPack = {
      ...shootPack,
      aRoll: [{ id: "wrong-ar", label: "Film desk reset", done: false }],
      props: [{ id: "wrong-prop", label: "Before frame", done: false }],
      visualNotes: input.visualDirection,
    };
    getProjectWorkspace
      .mockResolvedValueOnce(project())
      .mockResolvedValueOnce(project({ shootPack: persistedShootPack }));
    updateCard.mockImplementation(async (_projectId, patch) => project({
      shootPack: patch.shootPack,
    }));
    const tool = getRuntimeV4Tool("update_shoot_pack");

    const output = await tool?.handler(input, context);
    const verification = await tool?.verify?.(input, output, context);

    expect(output).toMatchObject({
      addedItemCount: 2,
      addedItems: [
        expect.objectContaining({ category: "aRoll", label: "Film desk reset", done: true }),
        expect.objectContaining({ category: "props", label: "Before frame", done: true }),
      ],
    });
    expect(verification).toMatchObject({
      verified: false,
    });
  });

  test("create_script_version verification rejects mismatched hook and caption", async () => {
    const input = {
      title: "Final Script",
      script: "This is the final script.",
      selectedHook: "I built the tool I needed.",
      caption: "Build in public, but keep the workspace honest.",
      status: "final" as const,
      metadata: {
        reviewer: "agent",
      },
    };
    createScriptVersion.mockResolvedValue({
      id: "script-version-final",
      title: input.title,
      active: true,
      scriptLab: {
        script: input.script,
        hook: input.selectedHook,
        caption: input.caption,
      },
      metadata: {
        ...input.metadata,
        status: input.status,
      },
    });
    loadScriptVersion.mockResolvedValue({
      id: "script-version-final",
      title: input.title,
      active: true,
      scriptLab: {
        angle: "",
        hook: "Wrong hook",
        outline: "",
        script: input.script,
        caption: "Wrong caption",
        onScreenText: "",
        cta: "",
        notes: "",
      },
      metadata: {
        ...input.metadata,
        status: input.status,
      },
    });
    const tool = getRuntimeV4Tool("create_script_version");

    const output = await tool?.handler(input, context);
    const verification = await tool?.verify?.(input, output, context);

    expect(verification).toMatchObject({
      verified: false,
    });
  });

  test("create_project_artifact creates and verifies typed artifacts", async () => {
    const input = {
      artifactType: "script_package",
      title: "Launch Script Package",
      payload: {
        script: "This is the script.",
      },
      metadata: {
        source: "test",
      },
    };
    createProjectArtifact.mockResolvedValue({
      id: "artifact-1",
    });
    supabaseSingle({
      id: "artifact-1",
      artifact_type: input.artifactType,
      title: input.title,
      payload: input.payload,
      metadata: input.metadata,
    });
    const tool = getRuntimeV4Tool("create_project_artifact");

    const output = await tool?.handler(input, context);
    const verification = await tool?.verify?.(input, output, context);

    expect(createProjectArtifact).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      threadId: "thread-1",
      toolCallId: null,
      artifactType: input.artifactType,
      title: input.title,
      payload: input.payload,
      metadata: input.metadata,
    }));
    expect(verification).toMatchObject({
      verified: true,
      actual: expect.objectContaining({
        id: "artifact-1",
        artifact_type: input.artifactType,
      }),
    });
  });

  test("create_project_artifact verification rejects payload mismatch", async () => {
    const input = {
      type: "note",
      title: "Artifact Note",
      content: {
        note: "Keep the launch reel direct.",
      },
      metadata: {
        source: "agent",
      },
    };
    createProjectArtifact.mockResolvedValue({
      id: "artifact-payload-mismatch",
    });
    supabaseSingle({
      id: "artifact-payload-mismatch",
      artifact_type: input.type,
      title: input.title,
      payload: {
        note: "Different payload.",
      },
      metadata: input.metadata,
    });
    const tool = getRuntimeV4Tool("create_project_artifact");

    const output = await tool?.handler(input, context);
    const verification = await tool?.verify?.(input, output, context);

    expect(verification).toMatchObject({
      verified: false,
    });
  });

  test("create_script_version verification checks selected status persistence", async () => {
    const input = {
      title: "Selected Script",
      script: "This is the selected script.",
      status: "selected" as const,
    };
    createScriptVersion.mockResolvedValue({
      id: "script-version-selected",
      title: input.title,
      active: true,
      scriptLab: {
        script: input.script,
      },
      metadata: {
        status: input.status,
      },
    });
    loadScriptVersion.mockResolvedValue({
      id: "script-version-selected",
      title: input.title,
      active: false,
      scriptLab: {
        script: input.script,
      },
      metadata: {
        status: "draft",
      },
    });
    const tool = getRuntimeV4Tool("create_script_version");

    const output = await tool?.handler(input, context);
    const verification = await tool?.verify?.(input, output, context);

    expect(verification).toMatchObject({
      verified: false,
    });
  });

  test("record_project_memory verifies ProjectMind can read the memory", async () => {
    const input = {
      memoryType: "creative_direction" as const,
      content: "Keep the launch reel honest and devlog-like.",
      importance: "high" as const,
      source: "agent",
    };
    saveProjectMemory.mockResolvedValue({
      id: "memory-1",
      projectId: "project-1",
      ownerId: "user-1",
      memoryType: input.memoryType,
      summary: input.content,
      content: { importance: input.importance },
    });
    listProjectMemories.mockResolvedValue([
      {
        id: "memory-1",
        projectId: "project-1",
        ownerId: "user-1",
        memoryType: input.memoryType,
        summary: input.content,
      },
    ]);
    const tool = getRuntimeV4Tool("record_project_memory");

    const output = await tool?.handler(input, context);
    const verification = await tool?.verify?.(input, output, context);

    expect(saveProjectMemory).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-1",
      threadId: "thread-1",
      runId: "run-1",
      memoryType: input.memoryType,
      summary: input.content,
    }));
    expect(verification).toMatchObject({
      verified: true,
      actual: expect.objectContaining({ id: "memory-1" }),
    });
  });
});
