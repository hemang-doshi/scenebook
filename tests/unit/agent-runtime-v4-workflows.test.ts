import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, test, vi } from "vitest";

import { agentDecisionSchema } from "@/lib/agent/runtime-v4/decision/schemas";
import { listRuntimeV4Workflows } from "@/lib/agent/runtime-v4/workflows/workflow-registry";
import { WorkflowExecutor } from "@/lib/agent/runtime-v4/workflows/workflow-executor";
import { runtimeV4WorkflowNames } from "@/lib/agent/runtime-v4/workflows/types";
import type { ProjectMindSnapshot } from "@/lib/agent/runtime-v4/memory/memory-types";

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
    creativeBrief: {
      audience: "indie builders",
      platform: "instagram",
      format: "reel",
      tone: "honest founder-devlog",
      coreAngle: "Show SceneBook being built from the creator workflow problem.",
      viewerPromise: "Understand why the product exists.",
      visualStyle: "screen recordings with candid founder narration",
      cta: "Follow the build.",
      openQuestions: [],
    },
    activeGoal: null,
    scriptLab: {
      angle: "",
      hook: "I built SceneBook because video ideas kept getting scattered.",
      outline: "",
      script: "A draft script about building SceneBook.",
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
    analytics: null,
    conversation: { recentMessages: [] },
    toolHistory: [],
    memory: [],
    readiness: {
      briefCompleteness: 80,
      scriptCompleteness: 30,
      assetReadiness: 0,
      shootReadiness: 0,
      editorReadiness: 0,
      publishReadiness: 0,
      nextLikelyStage: "scripting",
      missing: ["assets", "shoot pack"],
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

describe("runtime-v4 creative workflows", () => {
  test("registry contains all v4 workflows", () => {
    expect(listRuntimeV4Workflows().map((workflow) => workflow.name)).toEqual([...runtimeV4WorkflowNames]);
  });

  test("decision schema only accepts executable runtime-v4 workflow names", () => {
    const registered = new Set(listRuntimeV4Workflows().map((workflow) => workflow.name));

    for (const workflowName of runtimeV4WorkflowNames) {
      const decision = agentDecisionSchema.parse({
        type: "workflow_call",
        workflowName,
        input: { prompt: "test" },
        reason: "test",
      });

      expect(decision.workflowName).toBe(workflowName);
      expect(registered.has(decision.workflowName)).toBe(true);
    }
  });

  test("legacy workflow names normalize to executable runtime-v4 workflow names", () => {
    const decision = agentDecisionSchema.parse({
      type: "workflow_call",
      workflowName: "script_workflow",
      input: { prompt: "old workflow" },
      reason: "legacy runtime named the script workflow differently",
    });

    expect(decision).toMatchObject({
      type: "workflow_call",
      workflowName: "create_script_package",
    });
  });

  test("executor validates input", async () => {
    const executor = new WorkflowExecutor({ applyPatch: false });

    const result = await executor.execute({
      workflowName: "plan_reel",
      input: {},
      projectMind: projectMind(),
      context,
    });

    expect(result.workflowResult.status).toBe("failed");
    expect(result.observation.message).toMatch(/prompt/i);
  });

  test("normalized legacy workflows execute through the registered v4 executor", async () => {
    const executor = new WorkflowExecutor({ applyPatch: false });
    const parsedDecision = agentDecisionSchema.parse({
      type: "workflow_call",
      workflowName: "script_workflow",
      input: { prompt: "old workflow" },
      reason: "legacy runtime named the script workflow differently",
    });

    if (parsedDecision.type !== "workflow_call") {
      throw new Error(`Expected workflow_call, received ${parsedDecision.type}.`);
    }

    const result = await executor.execute({
      workflowName: parsedDecision.workflowName,
      input: parsedDecision.input,
      projectMind: projectMind(),
      context,
    });

    expect(result.workflowResult.status).toBe("completed");
  });

  test("plan_reel returns structured plan and ProjectPatch", async () => {
    const executor = new WorkflowExecutor({ applyPatch: false });
    const result = await executor.execute({
      workflowName: "plan_reel",
      input: { prompt: "Help me make a reel about building SceneBook" },
      projectMind: projectMind(),
      context,
    });

    expect(result.workflowResult.status).toBe("completed");
    expect(result.observation.message).toContain("Angle:");
    expect(result.workflowResult.status === "completed" ? result.workflowResult.patch?.operations.map((op) => op.type) : []).toEqual([
      "update_creative_brief",
      "update_active_goal",
      "record_project_memory",
    ]);
  });

  test("create_script_package returns hooks/script and ProjectPatch", async () => {
    const executor = new WorkflowExecutor({ applyPatch: false });
    const result = await executor.execute({
      workflowName: "create_script_package",
      input: { prompt: "Write the script for the SceneBook launch reel" },
      projectMind: projectMind(),
      context,
    });

    expect(result.workflowResult.status).toBe("completed");
    expect(result.observation.message).toContain("Recommended hook");
    expect(result.workflowResult.status === "completed" ? result.workflowResult.patch?.operations.map((op) => op.type) : []).toContain("create_script_version");
  });

  test("create_shoot_pack returns checklist and ProjectPatch", async () => {
    const executor = new WorkflowExecutor({ applyPatch: false });
    const result = await executor.execute({
      workflowName: "create_shoot_pack",
      input: { prompt: "Turn this into a shot list" },
      projectMind: projectMind(),
      context,
    });

    expect(result.workflowResult.status).toBe("completed");
    expect(result.workflowResult.status === "completed" ? result.workflowResult.patch?.operations.map((op) => op.type) : []).toEqual([
      "update_shoot_pack",
      "create_project_artifact",
    ]);
  });

  test("create_asset_prompt_pack returns prompt artifact and ProjectPatch", async () => {
    const executor = new WorkflowExecutor({ applyPatch: false });
    const result = await executor.execute({
      workflowName: "create_asset_prompt_pack",
      input: { prompt: "Make prompts for the assets" },
      projectMind: projectMind(),
      context,
    });

    expect(result.workflowResult.status).toBe("completed");
    expect(result.observation.message).toContain("No media was generated");
  });

  test("review_content returns critique and improved version", async () => {
    const executor = new WorkflowExecutor({ applyPatch: false });
    const result = await executor.execute({
      workflowName: "review_content",
      input: { target: "script", content: "SceneBook helps me make reels." },
      projectMind: projectMind(),
      context,
    });

    expect(result.workflowResult.status).toBe("completed");
    expect(result.observation.message).toContain("Improved script");
  });

  test("prepare_publish_package returns caption and does not publish", async () => {
    const executor = new WorkflowExecutor({ applyPatch: false });
    const result = await executor.execute({
      workflowName: "prepare_publish_package",
      input: { prompt: "Prepare captions and hashtags", platform: "instagram" },
      projectMind: projectMind(),
      context,
    });

    expect(result.workflowResult.status).toBe("completed");
    expect(result.observation.message).toContain("No external publishing");
    expect(JSON.stringify(result.workflowResult)).not.toMatch(/nango|publish externally/i);
  });

  test("workflow result with ProjectPatch applies through PatchExecutor when configured", async () => {
    const patchExecutor = {
      apply: vi.fn(async () => ({
        status: "completed" as const,
        operations: [],
        summary: "Applied patch.",
        successfulOperations: 0,
        failedOperations: 0,
        retryable: false,
        events: [],
      })),
    };
    const executor = new WorkflowExecutor({ patchExecutor });

    const result = await executor.execute({
      workflowName: "plan_reel",
      input: { prompt: "Help me make a reel about building SceneBook" },
      projectMind: projectMind(),
      context,
    });

    expect(patchExecutor.apply).toHaveBeenCalled();
    expect(result.observation.message).toBe("Applied patch.");
  });

  test("workflows do not import provider SDKs directly", async () => {
    const workflowsDir = path.join(process.cwd(), "lib", "agent", "runtime-v4", "workflows");
    const filenames = await readdir(workflowsDir);
    const sources = await Promise.all(
      filenames
        .filter((filename) => filename.endsWith(".ts"))
        .map(async (filename) => readFile(path.join(workflowsDir, filename), "utf8")),
    );

    expect(sources.join("\n")).not.toMatch(/@ai-sdk\/google|@ai-sdk\/openai-compatible/);
  });

  test("workflows do not directly mutate database state", async () => {
    const workflowsDir = path.join(process.cwd(), "lib", "agent", "runtime-v4", "workflows");
    const filenames = await readdir(workflowsDir);
    const sources = await Promise.all(
      filenames
        .filter((filename) => filename.endsWith(".ts"))
        .map(async (filename) => readFile(path.join(workflowsDir, filename), "utf8")),
    );

    expect(sources.join("\n")).not.toMatch(
      /createSupabaseServerClient|updateCard|upsertCreativeBrief|upsertActiveGoal|createScriptVersion|saveProjectMemory|createProjectArtifact/,
    );
  });
});
