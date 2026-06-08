import { describe, expect, test, vi } from "vitest";

import type { ModelGateway } from "@/lib/ai/model-gateway";
import type { ProjectMindSnapshot } from "@/lib/agent/runtime-v4/memory/memory-types";
import { WorkflowExecutor } from "@/lib/agent/runtime-v4/workflows/workflow-executor";

function projectMind(): ProjectMindSnapshot {
  return {
    project: {
      id: "project-1",
      ownerId: "user-1",
      title: "Building SceneBook in public",
      status: "idea",
      format: "reel",
      platform: "instagram",
      topicTags: ["build-in-public"],
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
      script: "SceneBook helps creators move from idea to script to shoot pack.",
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
    integrationState: {
      available: false,
      connections: [],
      note: "External integrations are not wired in Agent v4 yet.",
    },
    editor: { ready: false, integrationAvailable: false, note: "" },
    publish: { ready: false, integrationAvailable: false, caption: null },
    analytics: null,
    conversation: { recentMessages: [] },
    toolHistory: [],
    memory: [],
    readiness: {
      briefCompleteness: 0,
      scriptCompleteness: 30,
      assetReadiness: 0,
      shootReadiness: 0,
      editorReadiness: 0,
      publishReadiness: 0,
      nextLikelyStage: "briefing",
      missing: ["creative brief"],
    },
  };
}

const context = {
  userId: "user-1",
  projectId: "project-1",
  threadId: "thread-1",
  runId: "run-1",
  source: "agent",
};

const outputs: Record<string, unknown> = {
  PlanReelOutput: {
    angle: "Build SceneBook from the messy creator workflow.",
    audience: "indie builders",
    emotionalPromise: "Feel the workflow become shoot-ready.",
    contentStructure: ["Messy idea", "SceneBook workspace", "Ready package"],
    visualStyle: "screen recordings with founder narration",
    productionChecklist: ["Record UI", "Capture notes", "Film hook"],
    nextBestAction: "Draft the script package.",
    assumptions: [],
    openQuestions: [],
  },
  ScriptPackageOutput: {
    hookOptions: ["The idea should not die between notes and edit."],
    selectedHook: "The idea should not die between notes and edit.",
    script: "SceneBook helps creators move from idea to script to shoot pack.",
    voiceover: "Candid founder narration.",
    onScreenText: "Idea -> script -> shoot pack",
    cta: "Follow the build.",
    captionSeed: "Building SceneBook from the messy middle.",
    structure: ["Hook", "Problem", "Proof", "CTA"],
    pacingNotes: "Keep proof cuts tight.",
    estimatedDurationSeconds: 30,
  },
  ShootPackOutput: {
    scenes: ["Desk hook", "UI proof", "Shoot checklist"],
    aRoll: ["Record hook"],
    bRoll: ["Notes beside laptop"],
    screenCaptures: ["Script Lab"],
    props: ["Laptop"],
    missingAssets: ["Thumbnail frame"],
    visualNotes: "screen recordings with founder narration",
    locationNotes: "quiet desk",
    editingNotes: "Cut on proof moments.",
    feasibilityNotes: "Ready after screen capture.",
  },
  AssetPromptPackOutput: {
    cinematicJsonPrompts: [{ scene: "creator desk" }],
    imagePrompts: ["SceneBook open on a creator desk."],
    brollPrompts: ["Hands arranging shoot notes."],
    thumbnailPrompt: "Idea to shoot pack.",
    voiceoverDirection: "Plain founder tone.",
    musicDirection: "Light optimistic bed.",
    negativePrompts: ["fake UI"],
    modelNotes: "Prompt artifacts only.",
  },
  ReviewOutput: {
    scorecard: { clarity: 8, specificity: 8, momentum: 8, fitToGoal: 9 },
    strengths: ["Specific workflow problem"],
    weaknesses: ["Needs faster visual proof"],
    specificImprovements: ["Show the workspace sooner"],
    improvedVersion: "Improved script: SceneBook takes the idea to a shoot pack.",
    keep: ["Specificity"],
    cut: ["Generic claims"],
    riskNotes: ["No auto-publish claims."],
  },
  PublishPrepOutput: {
    caption: "Building SceneBook from idea to shoot pack.",
    hashtags: ["#buildinpublic", "#creatorworkflow"],
    postingChecklist: ["Check first frame"],
    thumbnailText: "Idea to shoot pack",
    description: "SceneBook build reel.",
    firstComment: "Where does your idea get stuck?",
    readinessWarnings: ["No external publishing was performed."],
    platformNotes: "Prepared for Instagram manual posting.",
  },
};

function gateway(): ModelGateway {
  return {
    provider: "fake",
    generateStructured: vi.fn(async (input) => ({
      object: input.schema.parse(outputs[input.schemaName ?? ""]),
      rawText: JSON.stringify(outputs[input.schemaName ?? ""]),
      finishReason: "stop",
    })),
    generateText: vi.fn(),
    streamText: vi.fn(),
  } as unknown as ModelGateway;
}

async function run(workflowName: string, input: unknown) {
  return new WorkflowExecutor({ applyPatch: false, modelGateway: gateway() }).execute({
    workflowName,
    input,
    projectMind: projectMind(),
    context,
  });
}

describe("runtime-v4 creative trajectories", () => {
  test("Help me make a reel about building SceneBook produces a production plan", async () => {
    const result = await run("plan_reel", { prompt: "Help me make a reel about building SceneBook" });

    expect(result.workflowResult.status).toBe("completed");
    expect(result.observation.message).toContain("Angle:");
    expect(result.workflowResult.status === "completed" ? result.workflowResult.patch?.operations.map((op) => op.type) : []).toEqual([
      "update_creative_brief",
      "update_active_goal",
      "record_project_memory",
    ]);
  });

  test("Write the script for the SceneBook launch reel creates a script package", async () => {
    const result = await run("create_script_package", { prompt: "Write the script for the SceneBook launch reel" });

    expect(result.workflowResult.status).toBe("completed");
    expect(result.observation.message).toContain("Recommended hook");
    expect(result.workflowResult.status === "completed" ? result.workflowResult.patch?.operations.map((op) => op.type) : []).toContain("create_script_version");
  });

  test("Turn this into a shot list creates a shoot pack", async () => {
    const result = await run("create_shoot_pack", { prompt: "Turn this into a shot list" });

    expect(result.workflowResult.status).toBe("completed");
    expect(result.workflowResult.status === "completed" ? result.workflowResult.patch?.operations.map((op) => op.type) : []).toContain("update_shoot_pack");
  });

  test("Make prompts for the assets creates an asset prompt artifact", async () => {
    const result = await run("create_asset_prompt_pack", { prompt: "Make prompts for the assets" });

    expect(result.workflowResult.status).toBe("completed");
    expect(result.observation.message).toContain("No media was generated");
  });

  test("Review this script creates a critique", async () => {
    const result = await run("review_content", { target: "script", content: "Review this script" });

    expect(result.workflowResult.status).toBe("completed");
    expect(result.observation.message).toContain("Improved script");
  });

  test("Prepare captions and hashtags creates publish package but does not publish externally", async () => {
    const result = await run("prepare_publish_package", { prompt: "Prepare captions and hashtags", platform: "instagram" });

    expect(result.workflowResult.status).toBe("completed");
    expect(result.observation.message).toContain("No external publishing");
    expect(JSON.stringify(result.workflowResult)).not.toMatch(/nango/i);
  });
});
