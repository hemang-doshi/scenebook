import { beforeEach, describe, expect, test, vi } from "vitest";

import type { AgentDecision, ProjectSnapshot, ToolObservation } from "@/lib/agent/runtime-v3/types";
import type { WorkflowRunInput } from "@/lib/agent/runtime-v3/workflows/types";

const executeRuntimeV3Tool = vi.fn();
const generateText = vi.fn();

vi.mock("@/lib/agent/runtime-v3/tools/executor", () => ({
  executeRuntimeV3Tool,
}));

vi.mock("@/lib/ai/client", () => ({
  generateText,
}));

function observation(toolName: string, output: Record<string, unknown> = {}, status: ToolObservation["status"] = "completed"): ToolObservation {
  return {
    toolName,
    toolCallId: `${toolName}-call`,
    status,
    message: status === "awaiting_approval" ? "Approval required." : `${toolName} completed.`,
    output: output as Record<string, never>,
  };
}

type SnapshotOverrides = Partial<Omit<ProjectSnapshot, "project" | "scriptLab">> & {
  project?: Partial<ProjectSnapshot["project"]>;
  scriptLab?: Partial<ProjectSnapshot["scriptLab"]>;
};

function snapshot(overrides: SnapshotOverrides = {}): ProjectSnapshot {
  const base: ProjectSnapshot = {
    project: {
      id: "project-1",
      title: "Bronze watch hero reel",
      platform: "instagram",
      format: "reel",
      status: "idea",
    },
    creativeBrief: {
      audience: "young builders",
      platform: "instagram",
      format: "reel",
      tone: "polished but honest",
      coreAngle: "building in public without overplanning",
    },
    activeGoal: null,
    scriptLab: {
      angle: "Building in public",
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
    assets: {
      count: 0,
      folders: [],
      looseAssetCount: 0,
      recent: [],
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
    conversation: {
      recentMessages: [],
    },
    toolHistory: [],
    memory: [],
    readiness: {
      briefCompleteness: 70,
      scriptCompleteness: 0,
      assetReadiness: 0,
      shootReadiness: 0,
      editorReadiness: 0,
      publishReadiness: 0,
      nextLikelyStage: "scripting",
      missing: ["script", "assets"],
    },
  };

  return {
    ...base,
    ...overrides,
    project: {
      ...base.project,
      ...overrides.project,
    },
    scriptLab: {
      ...base.scriptLab,
      ...overrides.scriptLab,
    },
  };
}

function workflowInput(decision: Extract<AgentDecision, { type: "workflow_call" }>, state = snapshot()): WorkflowRunInput {
  return {
    decision,
    snapshot: state,
    context: {
      projectId: "project-1",
      threadId: "thread-1",
      runId: "run-1",
      userId: "user-1",
      rawInput: typeof decision.input === "object" && decision.input !== null && "prompt" in decision.input
        ? String((decision.input as { prompt?: unknown }).prompt)
        : typeof decision.input === "object" && decision.input !== null && "request" in decision.input
          ? String((decision.input as { request?: unknown }).request)
          : "",
      snapshot: state,
      selectedModels: { chat: "test-model" },
    },
    stream: { emit: vi.fn(), emitLegacyTool: vi.fn() } as never,
  };
}

function toolNames() {
  return executeRuntimeV3Tool.mock.calls.map(([input]) => input.toolName);
}

function rawInputs() {
  return executeRuntimeV3Tool.mock.calls.map(([input]) => input.rawInput);
}

describe("runtime-v3 Phase 6A workflows", () => {
  beforeEach(() => {
    vi.resetModules();
    executeRuntimeV3Tool.mockReset();
    generateText.mockReset();
    executeRuntimeV3Tool.mockImplementation(async ({ toolName }: { toolName: string }) => {
      if (toolName === "generate_script_package") {
        return observation(toolName, {
          kind: "script_package",
          hook: "I wasted six months planning content instead of posting.",
          outline: "Open with confession\nShow the dashboard\nEnd with the lesson",
          script: "I spent six months planning the perfect content system. Then I realized posting teaches faster than planning.",
          caption: "Build in public before it feels ready.",
          cta: "Follow for the build notes.",
          onScreenText: "Planning is not publishing.",
        });
      }
      if (toolName === "generate_prompt_json") {
        return observation(toolName, {
          kind: "prompt_json",
          modality: "image",
          prompt: "Cinematic vertical thumbnail of the SceneBook dashboard with warm monitor light.",
          aspect_ratio: "9:16",
          subject: { primary: "SceneBook dashboard" },
          scene: { environment: "creator desk setup" },
          camera: { shot_type: "close-up" },
          lighting: { style: "warm monitor glow" },
          style: { aesthetic: "cinematic product still" },
          parameters: { guidance: 7 },
        });
      }
      if (toolName === "critique_script") {
        return observation(toolName, {
          kind: "script_critique",
          critique: "The hook is specific and the payoff is clear.",
        });
      }
      if (toolName === "update_script_lab") {
        return observation(toolName, { kind: "script_lab_update" });
      }
      if (toolName === "create_script_version") {
        return observation(toolName, { kind: "script_version", versionId: "version-1", active: true });
      }
      if (toolName === "create_project_artifact") {
        return observation(toolName, { kind: "project_artifact", artifactId: "artifact-1" });
      }
      if (toolName === "update_active_goal") {
        return observation(toolName, { kind: "active_goal", stage: "asset_planning" });
      }
      if (toolName === "update_creative_brief") {
        return observation(toolName, { kind: "creative_brief" });
      }
      if (toolName === "update_shoot_pack") {
        return observation(toolName, { kind: "shoot_pack_update" });
      }
      if (toolName === "create_asset_folder") {
        return observation(toolName, {
          kind: "asset_folder",
          folderId: "folder-thumbnails",
          folderName: "Thumbnails",
        });
      }
      if (toolName === "generate_media_asset") {
        return observation(toolName, {
          kind: "media_asset",
          assetId: "asset-1",
          generationId: "generation-1",
          url: "https://example.com/asset.png",
          folderId: "folder-thumbnails",
          folderName: "Thumbnails",
          model: "sdxl",
          provider: "huggingface",
          prompt: "Cinematic vertical thumbnail of the SceneBook dashboard with warm monitor light.",
          modality: "image",
        });
      }
      return observation(toolName);
    });
  });

  test("vague script asks questions and makes no tool call", async () => {
    const { runWorkflow } = await import("@/lib/agent/runtime-v3/workflows");
    const result = await runWorkflow(workflowInput({
      type: "workflow_call",
      workflowName: "script_workflow",
      input: { prompt: "/script" },
      reason: "test",
    }, snapshot({ creativeBrief: null })));

    expect(result.waitingForUser).toBe(true);
    expect(result.finalResponse).toContain("Who is this for?");
    expect(executeRuntimeV3Tool).not.toHaveBeenCalled();
  });

  test("detailed script generates, critiques, saves, versions, artifacts, and updates goal", async () => {
    const { runWorkflow } = await import("@/lib/agent/runtime-v3/workflows");
    const result = await runWorkflow(workflowInput({
      type: "workflow_call",
      workflowName: "script_workflow",
      input: {
        prompt: "Write a 30s Instagram Reel script for a raw devlog about building SceneBook, aimed at young builders, polished but honest tone.",
      },
      reason: "test",
    }, snapshot({
      activeGoal: {
        id: "goal-1",
        title: "Ship the reel",
        status: "active",
        stage: "scripting",
        completedSteps: ["brief"],
        nextActions: ["write script"],
        blockers: [],
      },
    })));

    expect(toolNames()).toEqual([
      "generate_script_package",
      "critique_script",
      "update_script_lab",
      "create_script_version",
      "create_project_artifact",
      "update_active_goal",
    ]);
    expect(rawInputs()[2]).toMatchObject({
      hook: "I wasted six months planning content instead of posting.",
      script: expect.stringContaining("posting teaches faster"),
    });
    expect(rawInputs()[5]).toMatchObject({
      stage: "asset_planning",
      completedSteps: ["brief", "script"],
    });
    expect(result.finalResponse).toContain("saved, versioned, and verified");
  });

  test("critique-only reviews current script without mutation", async () => {
    const { runWorkflow } = await import("@/lib/agent/runtime-v3/workflows");
    const result = await runWorkflow(workflowInput({
      type: "workflow_call",
      workflowName: "script_workflow",
      input: { prompt: "Is this script good? Be harsh." },
      reason: "test",
    }, snapshot({ scriptLab: { script: "Current script text." } })));

    expect(toolNames()).toEqual(["critique_script"]);
    expect(result.finalResponse).toContain("The hook is specific");
  });

  test("rewrite without save drafts only", async () => {
    const { runWorkflow } = await import("@/lib/agent/runtime-v3/workflows");
    const result = await runWorkflow(workflowInput({
      type: "workflow_call",
      workflowName: "script_workflow",
      input: { prompt: "Make this script punchier but don't save it yet." },
      reason: "test",
    }, snapshot({ scriptLab: { script: "Current script text." } })));

    expect(toolNames()).toEqual(["critique_script", "generate_script_package"]);
    expect(result.finalResponse).toContain("I did not save it");
  });

  test("rewrite-and-save stops at approval when finalized overwrite requires approval", async () => {
    executeRuntimeV3Tool.mockImplementation(async ({ toolName }: { toolName: string }) => {
      if (toolName === "update_script_lab") {
        return observation(toolName, { kind: "approval_request" }, "awaiting_approval");
      }
      if (toolName === "generate_script_package") {
        return observation(toolName, {
          kind: "script_package",
          hook: "Sharper hook",
          outline: "One\nTwo",
          script: "Sharper script.",
          caption: "Sharper caption.",
          cta: "Follow.",
          onScreenText: "Sharper.",
        });
      }
      if (toolName === "critique_script") {
        return observation(toolName, { kind: "script_critique", critique: "Needs a sharper first beat." });
      }
      return observation(toolName);
    });

    const { runWorkflow } = await import("@/lib/agent/runtime-v3/workflows");
    const result = await runWorkflow(workflowInput({
      type: "workflow_call",
      workflowName: "script_workflow",
      input: { prompt: "Make this script punchier and save it as the current version." },
      reason: "test",
    }, snapshot({
      project: { status: "posted" },
      scriptLab: { script: "Current script text." },
    })));

    expect(toolNames()).toEqual(["critique_script", "generate_script_package", "update_script_lab"]);
    expect(result.finalResponse).toContain("approval is required");
  });

  test("save hook calls only update_script_lab", async () => {
    const { runWorkflow } = await import("@/lib/agent/runtime-v3/workflows");
    const result = await runWorkflow(workflowInput({
      type: "workflow_call",
      workflowName: "workspace_control_workflow",
      input: { request: "Make this the hook: I wasted 6 months planning content instead of posting." },
      reason: "test",
    }));

    expect(toolNames()).toEqual(["update_script_lab"]);
    expect(rawInputs()[0]).toEqual({ hook: "I wasted 6 months planning content instead of posting." });
    expect(result.finalResponse).toContain("Hook changed");
  });

  test("SceneBook positioning correction updates brief, hook, CTA, and active goal", async () => {
    generateText.mockResolvedValue(JSON.stringify({
      creativeBrief: {
        audience: "solo and small-team short-form creators",
        tone: "sharp, creative, slightly cinematic, creator-native",
        coreAngle: "SceneBook is the AI production workspace and creator OS for short-form video.",
        viewerPromise: "Turn messy ideas into polished reels without juggling scattered tools.",
        visualStyle: "clean, fast, visual, tasteful, modern, cinematic",
        cta: "Start with a raw idea and build the whole reel inside one workspace.",
      },
      scriptLab: {
        angle: "SceneBook as the creator operating system for short-form video builders.",
        hook: "Every creator has 100 ideas and zero system.",
        cta: "Follow the build as SceneBook becomes the creative OS for short-form creators.",
        notes: "SceneBook is not a generic AI content generator; it is a project workspace for the full creator loop.",
      },
      goal: {
        title: "Turn updated SceneBook positioning into a launch reel",
        stage: "scripting",
        completedSteps: ["positioning"],
        nextActions: ["Draft the launch reel script", "Plan the shot list", "Generate asset prompts"],
        blockers: [],
      },
    }));

    const request = [
      "i want to chnage this. scenebook is something completely different:",
      "SceneBook is basically a **creator operating system for short-form video builders**.",
      "SceneBook helps creators plan, generate, organize, edit, and improve short-form videos from idea to final edit.",
    ].join("\n");

    const { runWorkflow } = await import("@/lib/agent/runtime-v3/workflows");
    const result = await runWorkflow(workflowInput({
      type: "workflow_call",
      workflowName: "workspace_control_workflow",
      input: { request, mode: "positioning_update" },
      reason: "test",
    }));

    expect(toolNames()).toEqual(["update_creative_brief", "update_script_lab", "update_active_goal"]);
    expect(rawInputs()[0]).toMatchObject({
      audience: "solo and small-team short-form creators",
      coreAngle: "SceneBook is the AI production workspace and creator OS for short-form video.",
    });
    expect(rawInputs()[1]).toMatchObject({
      hook: "Every creator has 100 ideas and zero system.",
      cta: "Follow the build as SceneBook becomes the creative OS for short-form creators.",
    });
    expect(rawInputs()[2]).toMatchObject({
      stage: "scripting",
      completedSteps: ["positioning"],
      nextActions: ["Draft the launch reel script", "Plan the shot list", "Generate asset prompts"],
    });
    expect(result.finalResponse).toContain("SceneBook positioning updated");
  });

  test("SceneBook positioning correction reports partial failures without claiming full success", async () => {
    generateText.mockResolvedValue(JSON.stringify({
      creativeBrief: {
        audience: "solo creators",
        coreAngle: "SceneBook is a creative production workspace.",
      },
      scriptLab: {
        hook: "Every creator has ideas scattered everywhere.",
        cta: "Follow the build.",
      },
      goal: {
        title: "Turn positioning into a launch reel",
        stage: "scripting",
        completedSteps: ["positioning"],
        nextActions: ["Draft the launch reel script"],
        blockers: [],
      },
    }));
    executeRuntimeV3Tool.mockImplementation(async ({ toolName }: { toolName: string }) => {
      if (toolName === "update_creative_brief") {
        return observation(
          toolName,
          {
            kind: "tool_error",
            message: "new row violates row-level security policy",
            error: {
              code: "42501",
              message: "new row violates row-level security policy",
              table: "project_creative_briefs",
              operation: "upsert",
              projectId: "project-1",
              recoverable: false,
            },
          },
          "failed",
        );
      }
      if (toolName === "update_script_lab") {
        return observation(toolName, { kind: "script_lab_update" });
      }
      if (toolName === "update_active_goal") {
        return observation(toolName, { kind: "active_goal" });
      }
      return observation(toolName);
    });

    const request = "SceneBook is basically a creator operating system for short-form video builders.";

    const { runWorkflow } = await import("@/lib/agent/runtime-v3/workflows");
    const result = await runWorkflow(workflowInput({
      type: "workflow_call",
      workflowName: "workspace_control_workflow",
      input: { request, mode: "positioning_update" },
      reason: "test",
    }));

    expect(toolNames()).toEqual(["update_creative_brief", "update_script_lab", "update_active_goal"]);
    expect(result.finalResponse).toContain("Partial update");
    expect(result.finalResponse).toContain("Successful: update_script_lab, update_active_goal");
    expect(result.finalResponse).toContain("Failed: update_creative_brief");
    expect(result.finalResponse).toContain("Reason: new row violates row-level security policy");
    expect(result.finalResponse).toContain("Retry safe: no");
    expect(result.finalResponse).not.toContain("SceneBook positioning updated");
  });

  test("add shoot tasks calls only update_shoot_pack", async () => {
    const { runWorkflow } = await import("@/lib/agent/runtime-v3/workflows");
    await runWorkflow(workflowInput({
      type: "workflow_call",
      workflowName: "workspace_control_workflow",
      input: { request: "Add these as shoot tasks: record intro, capture dashboard b-roll, film reaction shot." },
      reason: "test",
    }));

    expect(toolNames()).toEqual(["update_shoot_pack"]);
    expect(rawInputs()[0]).toEqual({
      category: "aRoll",
      tasks: ["record intro", "capture dashboard b-roll", "film reaction shot."],
    });
  });

  test("ambiguous save asks target and performs no mutation", async () => {
    const { runWorkflow } = await import("@/lib/agent/runtime-v3/workflows");
    const result = await runWorkflow(workflowInput({
      type: "workflow_call",
      workflowName: "workspace_control_workflow",
      input: { request: "Save this." },
      reason: "test",
    }));

    expect(result.waitingForUser).toBe(true);
    expect(result.finalResponse).toContain("hook, script, caption, CTA");
    expect(executeRuntimeV3Tool).not.toHaveBeenCalled();
  });

  test("vague asset request asks questions and makes no tool call", async () => {
    const { runWorkflow } = await import("@/lib/agent/runtime-v3/workflows");
    const result = await runWorkflow(workflowInput({
      type: "workflow_call",
      workflowName: "asset_workflow",
      input: { prompt: "make an asset", modality: "image" },
      reason: "test",
    }));

    expect(result.waitingForUser).toBe(true);
    expect(result.finalResponse).toContain("subject, scene, and style");
    expect(executeRuntimeV3Tool).not.toHaveBeenCalled();
  });

  test("asset workflow generates prompt JSON, prepares folder, generates asset, and updates goal", async () => {
    const { runWorkflow } = await import("@/lib/agent/runtime-v3/workflows");
    const result = await runWorkflow(workflowInput({
      type: "workflow_call",
      workflowName: "asset_workflow",
      input: {
        prompt: "Generate a cinematic thumbnail for the current reel and save it in Thumbnails.",
        modality: "image",
      },
      reason: "test",
    }, snapshot({
      activeGoal: {
        id: "goal-1",
        title: "Ship the reel",
        status: "active",
        stage: "generating_assets",
        completedSteps: ["script"],
        nextActions: ["generate thumbnail"],
        blockers: [],
      },
    })));

    expect(toolNames()).toEqual([
      "generate_prompt_json",
      "create_asset_folder",
      "generate_media_asset",
      "update_active_goal",
    ]);
    expect(rawInputs()[1]).toEqual({ name: "Thumbnails" });
    expect(rawInputs()[2]).toMatchObject({
      prompt: "Cinematic vertical thumbnail of the SceneBook dashboard with warm monitor light.",
      modality: "image",
      folderId: "folder-thumbnails",
      title: "Thumbnail",
      structuredPrompt: expect.objectContaining({ kind: "prompt_json" }),
      parameters: { guidance: 7 },
    });
    expect(rawInputs()[3]).toMatchObject({
      stage: "generating_assets",
      completedSteps: ["script", "asset generated"],
      nextActions: ["Review Thumbnail", "Prepare editor handoff"],
    });
    expect(result.finalResponse).toContain("Asset: asset-1");
    expect(result.finalResponse).toContain("Folder: Thumbnails");
    expect(result.finalResponse).toContain("huggingface / sdxl");
  });

  test("asset workflow uses create_asset_folder as the folder reuse boundary", async () => {
    executeRuntimeV3Tool.mockImplementation(async ({ toolName }: { toolName: string }) => {
      if (toolName === "generate_prompt_json") {
        return observation(toolName, {
          kind: "prompt_json",
          modality: "image",
          prompt: "Macro watch thumbnail on a dark workbench.",
          aspect_ratio: "9:16",
        });
      }
      if (toolName === "create_asset_folder") {
        return observation(toolName, {
          kind: "asset_folder",
          folderId: "existing-folder",
          folderName: "Thumbnails",
        });
      }
      if (toolName === "generate_media_asset") {
        return observation(toolName, {
          kind: "media_asset",
          assetId: "asset-existing",
          folderId: "existing-folder",
          folderName: "Thumbnails",
          model: "sdxl",
          provider: "huggingface",
        });
      }
      return observation(toolName);
    });

    const { runWorkflow } = await import("@/lib/agent/runtime-v3/workflows");
    await runWorkflow(workflowInput({
      type: "workflow_call",
      workflowName: "asset_workflow",
      input: { prompt: "Generate a cinematic thumbnail for the watch and save it in Thumbnails." },
      reason: "test",
    }));

    expect(rawInputs()[1]).toEqual({ name: "Thumbnails" });
    expect(rawInputs()[2]).toMatchObject({ folderId: "existing-folder" });
  });

  test("asset generation failure makes no success claim and does not update goal", async () => {
    executeRuntimeV3Tool.mockImplementation(async ({ toolName }: { toolName: string }) => {
      if (toolName === "generate_prompt_json") {
        return observation(toolName, {
          kind: "prompt_json",
          modality: "image",
          prompt: "Cinematic thumbnail prompt.",
        });
      }
      if (toolName === "create_asset_folder") {
        return observation(toolName, {
          kind: "asset_folder",
          folderId: "folder-thumbnails",
          folderName: "Thumbnails",
        });
      }
      if (toolName === "generate_media_asset") {
        return observation(toolName, { kind: "tool_error", message: "Provider failed." }, "failed");
      }
      return observation(toolName);
    });

    const { runWorkflow } = await import("@/lib/agent/runtime-v3/workflows");
    const result = await runWorkflow(workflowInput({
      type: "workflow_call",
      workflowName: "asset_workflow",
      input: { prompt: "Generate a cinematic thumbnail for the current reel and save it in Thumbnails." },
      reason: "test",
    }, snapshot({
      activeGoal: {
        id: "goal-1",
        title: "Ship the reel",
        status: "active",
        stage: "generating_assets",
        completedSteps: [],
        nextActions: [],
        blockers: [],
      },
    })));

    expect(toolNames()).toEqual(["generate_prompt_json", "create_asset_folder", "generate_media_asset"]);
    expect(result.finalResponse).toContain("Media generation did not complete");
    expect(result.finalResponse).not.toContain("verified");
  });

  test("ambiguous asset move asks for exact asset and folder without mutation", async () => {
    const { runWorkflow } = await import("@/lib/agent/runtime-v3/workflows");
    const result = await runWorkflow(workflowInput({
      type: "workflow_call",
      workflowName: "workspace_control_workflow",
      input: { request: "Move asset to Thumbnails." },
      reason: "test",
    }, snapshot({
      assets: {
        count: 2,
        folders: [{ id: "folder-thumbnails", name: "Thumbnails", assetCount: 0 }],
        looseAssetCount: 2,
        recent: [
          { id: "asset-1", title: "Thumbnail A", type: "image", url: "https://example.com/a.png" },
          { id: "asset-2", title: "Thumbnail B", type: "image", url: "https://example.com/b.png" },
        ],
      },
    })));

    expect(result.waitingForUser).toBe(true);
    expect(result.finalResponse).toContain("Which asset");
    expect(executeRuntimeV3Tool).not.toHaveBeenCalled();
  });

  test("unambiguous asset move uses move_asset_to_folder", async () => {
    const { runWorkflow } = await import("@/lib/agent/runtime-v3/workflows");
    const result = await runWorkflow(workflowInput({
      type: "workflow_call",
      workflowName: "workspace_control_workflow",
      input: {
        request: "Move the selected asset.",
        assetId: "asset-1",
        folderId: "folder-thumbnails",
      },
      reason: "test",
    }));

    expect(toolNames()).toEqual(["move_asset_to_folder"]);
    expect(rawInputs()[0]).toEqual({ assetId: "asset-1", folderId: "folder-thumbnails" });
    expect(result.finalResponse).toContain("Asset moved");
  });
});
