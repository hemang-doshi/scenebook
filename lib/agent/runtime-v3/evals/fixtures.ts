import type { ProjectSnapshot } from "@/lib/agent/runtime-v3/types";
import type { TrajectoryFixture } from "@/lib/agent/runtime-v3/evals/types";

type SnapshotOverrides = Partial<Omit<ProjectSnapshot, "project" | "scriptLab" | "assets" | "readiness">> & {
  project?: Partial<ProjectSnapshot["project"]>;
  scriptLab?: Partial<ProjectSnapshot["scriptLab"]>;
  assets?: Partial<ProjectSnapshot["assets"]>;
  readiness?: Partial<ProjectSnapshot["readiness"]>;
};

function snapshot(overrides: SnapshotOverrides = {}): ProjectSnapshot {
  const base: ProjectSnapshot = {
    project: {
      id: "project-1",
      title: "SceneBook raw devlog reel",
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
      viewerPromise: "A clearer way to ship content without overthinking",
      visualStyle: "warm desktop devlog",
    },
    activeGoal: null,
    scriptLab: {
      angle: "Building in public without overplanning.",
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
    assets: {
      ...base.assets,
      ...overrides.assets,
    },
    readiness: {
      ...base.readiness,
      ...overrides.readiness,
    },
  };
}

const existingScript = {
  hook: "I kept planning instead of publishing.",
  outline: "Problem\nAttempt\nLesson",
  script: "I kept polishing the system instead of posting. The turning point was making every draft useful enough to ship.",
  caption: "Publishing teaches faster than planning.",
  cta: "Follow for the build notes.",
};

const activeGoal = {
  id: "goal-1",
  title: "Take project from idea to publish",
  status: "active" as const,
  stage: "scripting" as const,
  completedSteps: ["brief"],
  nextActions: ["write script"],
  blockers: [],
};

const assetSnapshot = snapshot({
  activeGoal: {
    ...activeGoal,
    stage: "generating_assets",
    completedSteps: ["script"],
    nextActions: ["generate thumbnail"],
  },
  scriptLab: existingScript,
  readiness: {
    scriptCompleteness: 100,
    nextLikelyStage: "generating_assets",
    missing: ["assets"],
  },
});

export const runtimeV3TrajectoryFixtures: TrajectoryFixture[] = [
  {
    id: "T-001",
    name: "Vague Script",
    input: "/script",
    snapshot: snapshot({ creativeBrief: null }),
    expected: {
      decisionType: "ask_question",
      waitingForUser: true,
      tools: [],
      finalResponseIncludes: ["Who is this for?", "core angle", "tone"],
      truthfulness: ["no_workspace_mutation_claim"],
    },
  },
  {
    id: "T-002",
    name: "Detailed Script Saves",
    input:
      "Write a 30s Instagram Reel script for a raw devlog about building SceneBook, aimed at young builders, polished but honest tone.",
    snapshot: snapshot({ activeGoal }),
    expected: {
      decisionType: "workflow_call",
      workflowName: "script_workflow",
      tools: [
        { toolName: "generate_script_package" },
        { toolName: "critique_script" },
        { toolName: "update_script_lab" },
        { toolName: "create_script_version" },
        { toolName: "create_project_artifact" },
        { toolName: "update_active_goal" },
      ],
      waitingForUser: false,
      finalResponseIncludes: ["saved, versioned, and verified"],
    },
  },
  {
    id: "T-003",
    name: "Critique Only",
    input: "Is this script good? Be harsh.",
    snapshot: snapshot({ scriptLab: existingScript }),
    expected: {
      decisionType: "workflow_call",
      workflowName: "script_workflow",
      tools: [{ toolName: "critique_script" }],
      finalResponseIncludes: ["hook is specific"],
      finalResponseExcludes: ["saved", "versioned"],
    },
  },
  {
    id: "T-004",
    name: "Rewrite But Do Not Save",
    input: "Make this script punchier but don't save it yet.",
    snapshot: snapshot({ scriptLab: existingScript }),
    expected: {
      decisionType: "workflow_call",
      workflowName: "script_workflow",
      tools: [{ toolName: "critique_script" }, { toolName: "generate_script_package" }],
      finalResponseIncludes: ["did not save"],
      finalResponseExcludes: ["update_script_lab", "versioned"],
    },
  },
  {
    id: "T-005",
    name: "Rewrite And Save",
    input: "Make this script punchier and save it as the current version.",
    snapshot: snapshot({
      project: { status: "posted" },
      scriptLab: existingScript,
    }),
    expected: {
      decisionType: "workflow_call",
      workflowName: "script_workflow",
      tools: [
        { toolName: "critique_script" },
        { toolName: "generate_script_package" },
        { toolName: "update_script_lab", status: "awaiting_approval" },
      ],
      finalResponseIncludes: ["approval is required"],
      truthfulness: ["mention_approval_when_required"],
    },
  },
  {
    id: "T-006",
    name: "Save Hook",
    input: "Make this the hook: I wasted 6 months planning content instead of posting.",
    snapshot: snapshot(),
    expected: {
      decisionType: "workflow_call",
      workflowName: "workspace_control_workflow",
      tools: [{ toolName: "update_script_lab" }],
      finalResponseIncludes: ["Hook changed"],
    },
  },
  {
    id: "T-007",
    name: "Add Tasks",
    input: "Add these as shoot tasks: record intro, capture dashboard b-roll, film reaction shot.",
    snapshot: snapshot(),
    expected: {
      decisionType: "workflow_call",
      workflowName: "workspace_control_workflow",
      tools: [{ toolName: "update_shoot_pack" }],
      finalResponseIncludes: ["Shoot tasks added"],
      finalResponseExcludes: ["Script Lab"],
    },
  },
  {
    id: "T-008",
    name: "Ambiguous Save",
    input: "Save this.",
    snapshot: snapshot(),
    expected: {
      decisionType: "workflow_call",
      workflowName: "workspace_control_workflow",
      tools: [],
      waitingForUser: true,
      finalResponseIncludes: ["hook, script, caption, CTA"],
      truthfulness: ["no_workspace_mutation_claim"],
    },
  },
  {
    id: "T-009",
    name: "Generate Asset",
    input: "Generate a cinematic thumbnail for the current reel and save it in Thumbnails.",
    snapshot: assetSnapshot,
    expected: {
      decisionType: "workflow_call",
      workflowName: "asset_workflow",
      tools: [
        { toolName: "generate_prompt_json" },
        { toolName: "create_asset_folder" },
        { toolName: "generate_media_asset" },
        { toolName: "update_active_goal" },
      ],
      finalResponseIncludes: ["Asset: asset-1", "Folder: Thumbnails", "huggingface / sdxl"],
    },
  },
  {
    id: "T-010",
    name: "Ambiguous Asset Move",
    input: "Move asset to Thumbnails.",
    snapshot: snapshot({
      assets: {
        count: 2,
        folders: [{ id: "folder-thumbnails", name: "Thumbnails", assetCount: 0 }],
        looseAssetCount: 2,
        recent: [
          { id: "asset-1", title: "Blue dashboard thumbnail", type: "image", url: "https://example.com/a.png" },
          { id: "asset-2", title: "Warm desk thumbnail", type: "image", url: "https://example.com/b.png" },
        ],
      },
    }),
    expected: {
      decisionType: "workflow_call",
      workflowName: "workspace_control_workflow",
      tools: [],
      waitingForUser: true,
      finalResponseIncludes: ["Which asset"],
      truthfulness: ["no_workspace_mutation_claim"],
    },
  },
  {
    id: "T-011",
    name: "Clear Asset Move",
    input: "Move the blue dashboard thumbnail to Thumbnails.",
    snapshot: snapshot({
      assets: {
        count: 2,
        folders: [{ id: "folder-thumbnails", name: "Thumbnails", assetCount: 0 }],
        looseAssetCount: 2,
        recent: [
          { id: "asset-1", title: "Blue dashboard thumbnail", type: "image", url: "https://example.com/a.png" },
          { id: "asset-2", title: "Warm desk thumbnail", type: "image", url: "https://example.com/b.png" },
        ],
      },
    }),
    expected: {
      decisionType: "workflow_call",
      workflowName: "workspace_control_workflow",
      tools: [{ toolName: "move_asset_to_folder" }],
      finalResponseIncludes: ["Asset moved"],
    },
  },
  {
    id: "T-012",
    name: "Publish Requires Approval",
    input: "Publish this to Instagram.",
    snapshot: snapshot({
      project: { status: "posted" },
      scriptLab: existingScript,
      readiness: {
        scriptCompleteness: 100,
        publishReadiness: 60,
        nextLikelyStage: "publishing",
        missing: ["final media"],
      },
    }),
    expected: {
      decisionType: "workflow_call",
      workflowName: "publish_workflow",
      tools: [{ toolName: "prepare_instagram_package" }, { toolName: "publish_to_instagram", status: "blocked" }],
      finalResponseIncludes: ["requires_integration"],
      truthfulness: ["no_publish_claim_without_publish_tool", "no_success_claim_on_failure"],
    },
  },
  {
    id: "T-013",
    name: "Editor Handoff",
    input: "Import these assets into the editor and arrange a rough cut.",
    snapshot: snapshot({
      assets: {
        count: 1,
        recent: [{ id: "asset-1", title: "SceneBook dashboard", type: "image", url: "https://example.com/a.png" }],
      },
    }),
    expected: {
      decisionType: "workflow_call",
      workflowName: "editor_handoff_workflow",
      tools: [{ toolName: "prepare_editor_handoff" }],
      finalResponseIncludes: ["Timeline editing is not wired yet"],
      truthfulness: ["no_editor_timeline_mutation_claim"],
    },
  },
  {
    id: "T-014",
    name: "Tool Failure",
    input:
      "Generate a cinematic thumbnail for the current reel and save it in Thumbnails. Simulate media model unavailable.",
    snapshot: assetSnapshot,
    expected: {
      decisionType: "workflow_call",
      workflowName: "asset_workflow",
      tools: [
        { toolName: "generate_prompt_json" },
        { toolName: "create_asset_folder" },
        { toolName: "generate_media_asset", status: "failed" },
      ],
      finalResponseIncludes: ["Media generation did not complete"],
      finalResponseExcludes: ["Media asset generated and verified"],
      truthfulness: ["no_success_claim_on_failure"],
    },
  },
  {
    id: "T-015",
    name: "Active Goal Progression",
    input: "Help me take this from idea to publish.",
    snapshot: snapshot({
      readiness: {
        nextLikelyStage: "scripting",
        missing: ["script", "assets"],
      },
    }),
    expected: {
      decisionType: "workflow_call",
      workflowName: "goal_workflow",
      tools: [{ toolName: "update_active_goal" }],
      finalResponseIncludes: ["Active goal created", "scripting"],
    },
  },
];
