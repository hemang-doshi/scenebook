import { describe, expect, test, vi } from "vitest";

import type { ModelGateway } from "@/lib/ai/model-gateway";
import type { ProjectMindSnapshot } from "@/lib/agent/runtime-v4/memory/memory-types";
import { WorkflowExecutor } from "@/lib/agent/runtime-v4/workflows/workflow-executor";

const context = {
  userId: "user-1",
  projectId: "project-1",
  threadId: "thread-1",
  runId: "run-1",
  source: "agent",
};

function projectMind(title = "Composting for city balconies"): ProjectMindSnapshot {
  return {
    project: {
      id: "project-1",
      ownerId: "user-1",
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

const plan = {
  angle: "Balcony composting without smell or overwhelm.",
  audience: "apartment gardeners",
  emotionalPromise: "Feel ready to start with one countertop habit.",
  contentStructure: ["Smell myth", "Tiny setup", "First week routine"],
  visualStyle: "bright kitchen counter demos",
  productionChecklist: ["Film the bin", "Show scraps", "Label the first week"],
  nextBestAction: "Draft the beginner script.",
  assumptions: ["Viewer has limited space."],
  openQuestions: [],
};

const scriptPackage = {
  hookOptions: ["Your balcony can handle composting."],
  selectedHook: "Your balcony can handle composting.",
  script: "Start small: jar, browns, scraps, and a weekly reset.",
  voiceover: "Warm practical narration.",
  onScreenText: "Small-space composting",
  cta: "Save this setup.",
  captionSeed: "Balcony composting can start tiny.",
  structure: ["Hook", "Demo", "Routine", "CTA"],
  pacingNotes: "Keep each demo beat under five seconds.",
  estimatedDurationSeconds: 32,
};

const shootPack = {
  scenes: ["Countertop setup", "Balcony placement"],
  aRoll: ["Explain the no-smell rule"],
  bRoll: ["Scraps going into jar"],
  screenCaptures: [],
  props: ["Jar", "paper", "scraps"],
  missingAssets: ["Final thumbnail frame"],
  visualNotes: "Bright kitchen counter demos",
  locationNotes: "Kitchen and balcony",
  editingNotes: "Use quick labels.",
  feasibilityNotes: "Shootable in one afternoon.",
};

const assetPromptPack = {
  cinematicJsonPrompts: [{ scene: "kitchen compost setup", style: "natural light" }],
  imagePrompts: ["Small balcony compost setup in natural light."],
  brollPrompts: ["Close-up of scraps and paper layers."],
  thumbnailPrompt: "Tiny balcony compost setup, readable label.",
  voiceoverDirection: "Friendly neighbor tone.",
  musicDirection: "Light acoustic bed.",
  negativePrompts: ["messy landfill", "stock photo"],
  modelNotes: "Prompt artifacts only.",
};

const publishPrep = {
  caption: "Small-space composting can start with one jar and one habit.",
  hashtags: ["#balconygarden", "#composting"],
  postingChecklist: ["Review captions", "Check first frame"],
  thumbnailText: "Compost in a tiny space",
  description: "A beginner reel for apartment composting.",
  firstComment: "What would stop you from trying this?",
  readinessWarnings: ["No external publishing was performed."],
  platformNotes: "Prepared for Instagram manual posting.",
};

const review = {
  scorecard: { clarity: 9, specificity: 8, momentum: 8, fitToGoal: 9 },
  strengths: ["Clear beginner promise"],
  weaknesses: ["Needs one more visual proof beat"],
  specificImprovements: ["Show the setup in the first five seconds"],
  improvedVersion: "Your balcony can handle composting if you start with one jar.",
  keep: ["Beginner tone"],
  cut: ["Abstract eco claims"],
  riskNotes: ["Do not overpromise no maintenance."],
};

function modelGateway(responses: Record<string, unknown>): ModelGateway {
  return {
    generateStructured: vi.fn(async (input) => ({
      object: input.schema.parse(responses[input.schemaName ?? ""]),
      rawText: JSON.stringify(responses[input.schemaName ?? ""]),
      finishReason: "stop",
    })),
    generateText: vi.fn(),
    streamText: vi.fn(),
  } as unknown as ModelGateway;
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

const workflowInputs: Array<[string, unknown]> = [
  ["plan_reel", { prompt: "Plan a reel" }],
  ["create_script_package", { prompt: "Write the script" }],
  ["create_shoot_pack", { prompt: "Make the shot list" }],
  ["create_asset_prompt_pack", { prompt: "Make asset prompts" }],
  ["review_content", { target: "script", content: "Composting is easy." }],
  ["prepare_publish_package", { prompt: "Prepare captions", platform: "instagram" }],
  ["create_full_production_package", { prompt: "Make the whole production package" }],
];

describe("model-backed runtime-v4 creative workflows", () => {
  test("workflows use structured model generation when the gateway succeeds", async () => {
    const gateway = modelGateway({
      PlanReelOutput: plan,
      ScriptPackageOutput: scriptPackage,
      ShootPackOutput: shootPack,
      AssetPromptPackOutput: assetPromptPack,
      ReviewOutput: review,
      PublishPrepOutput: publishPrep,
      ProductionPackageOutput: {
        plan,
        scriptPackage,
        shootPack,
        assetPromptPack,
        publishPrep,
        packageSummary: "Complete balcony composting production package.",
        nextBestAction: "Shoot the kitchen setup.",
      },
    });

    for (const [workflowName, input] of workflowInputs) {
      const result = await new WorkflowExecutor({ applyPatch: false, modelGateway: gateway }).execute({
        workflowName,
        input,
        projectMind: projectMind(),
        context,
      });

      expect(result.workflowResult.status).toBe("completed");
    }

    expect(gateway.generateStructured).toHaveBeenCalledTimes(workflowInputs.length);
  });

  test("workflows fall back deterministically when model generation fails", async () => {
    const gateway = failingGateway();

    for (const [workflowName, input] of workflowInputs) {
      const result = await new WorkflowExecutor({ applyPatch: false, modelGateway: gateway }).execute({
        workflowName,
        input,
        projectMind: projectMind(),
        context,
      });

      expect(result.workflowResult.status).toBe("completed");
    }
  });

  test("fallbacks adapt to a non-SceneBook project", async () => {
    const result = await new WorkflowExecutor({ applyPatch: false, modelGateway: failingGateway() }).execute({
      workflowName: "create_script_package",
      input: { prompt: "Write the script" },
      projectMind: projectMind("Composting for city balconies"),
      context,
    });

    expect(result.observation.message).toContain("Composting for city balconies");
    expect(result.observation.message).not.toContain("SceneBook launch");
  });

  test("full production package returns expected sections and ProjectPatch operations", async () => {
    const result = await new WorkflowExecutor({ applyPatch: false, modelGateway: failingGateway() }).execute({
      workflowName: "create_full_production_package",
      input: { prompt: "Make me the complete video package" },
      projectMind: projectMind(),
      context,
    });

    expect(result.workflowResult.status).toBe("completed");
    if (result.workflowResult.status !== "completed") return;
    expect(result.workflowResult.artifacts?.map((artifact) => artifact.type)).toEqual([
      "full_production_package",
      "asset_prompt_pack",
      "publish_package",
    ]);
    expect(result.workflowResult.patch?.operations.map((operation) => operation.type)).toEqual([
      "update_creative_brief",
      "update_active_goal",
      "create_script_version",
      "update_script_lab",
      "update_shoot_pack",
      "create_project_artifact",
      "create_project_artifact",
      "create_project_artifact",
      "record_project_memory",
    ]);
  });

  test("safe workflow patches auto-apply but large workflow patches are only planned", async () => {
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

    const executor = new WorkflowExecutor({ patchExecutor, modelGateway: failingGateway() });
    const safe = await executor.execute({
      workflowName: "plan_reel",
      input: { prompt: "Plan a reel" },
      projectMind: projectMind(),
      context,
    });
    const large = await executor.execute({
      workflowName: "create_full_production_package",
      input: { prompt: "Make the complete production package" },
      projectMind: projectMind(),
      context,
    });

    expect(safe.observation.message).toBe("Applied patch.");
    expect(patchExecutor.apply).toHaveBeenCalledTimes(1);
    expect(large.patchResult).toBeUndefined();
    expect(large.observation.output).toMatchObject({ patchAutoApplySkipped: true });
  });

  test("needs_input is blocked creative input, not approval", async () => {
    const gateway = modelGateway({
      PlanReelOutput: {
        ...plan,
        openQuestions: ["Who is the viewer?"],
      },
    });
    const mind = projectMind();
    mind.readiness.briefCompleteness = 0;

    const result = await new WorkflowExecutor({ applyPatch: false, modelGateway: gateway }).execute({
      workflowName: "plan_reel",
      input: { prompt: "Make a reel" },
      projectMind: mind,
      context,
    });

    expect(result.workflowResult.status).toBe("needs_input");
    expect(result.observation.status).toBe("blocked");
    expect(result.observation.output).toMatchObject({ kind: "creative_workflow_needs_input" });
  });
});
