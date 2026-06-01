import { describe, expect, test } from "vitest";

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

async function run(workflowName: string, input: unknown) {
  return new WorkflowExecutor({ applyPatch: false }).execute({
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
