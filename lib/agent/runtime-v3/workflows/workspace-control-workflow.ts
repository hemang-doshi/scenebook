import { generateText } from "@/lib/ai/client";
import { executeRuntimeV3Tool } from "@/lib/agent/runtime-v3/tools/executor";
import type { WorkflowHandlerInput, WorkflowResult } from "@/lib/agent/runtime-v3/workflows/types";

const goalStages = new Set([
  "ideating",
  "briefing",
  "scripting",
  "asset_planning",
  "generating_assets",
  "editing",
  "publishing",
  "analyzing",
  "complete",
]);

function workflowRequest(input: WorkflowHandlerInput) {
  return typeof input.workflowInput === "object" && input.workflowInput !== null && "request" in input.workflowInput
    ? String((input.workflowInput as { request?: unknown }).request ?? "")
    : input.context.rawInput;
}

function workflowObject(input: WorkflowHandlerInput) {
  return typeof input.workflowInput === "object" && input.workflowInput !== null
    ? input.workflowInput as { assetId?: unknown; folderId?: unknown; mode?: unknown }
    : {};
}

function extractAfter(pattern: RegExp, request: string) {
  return request.match(pattern)?.[1]?.trim() ?? null;
}

function parseShootTasks(request: string) {
  const raw = extractAfter(/add these as shoot tasks\s*:\s*(.+)$/i, request);
  if (!raw) {
    return null;
  }

  const tasks = raw
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return tasks.length > 0 ? tasks : null;
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseMoveFolderName(request: string) {
  return request.match(/\b(?:to|into)\s+([^.!?]+)[.!?]?\s*$/i)?.[1]?.replace(/\s+folder$/i, "").trim() ?? null;
}

function resolveAssetMove(input: WorkflowHandlerInput, request: string) {
  if (!/\bmove\b.*\b(asset|thumbnail|image|video|audio)\b.*\b(to|into)\b/i.test(request)) {
    return null;
  }

  const folderName = parseMoveFolderName(request);
  const folder = folderName
    ? input.snapshot.assets.folders.find((candidate) => candidate.name.toLowerCase() === folderName.toLowerCase())
    : null;
  const normalizedRequest = normalizeSearchText(request);
  const matchingAssets = input.snapshot.assets.recent.filter((asset) => {
    const tokens = normalizeSearchText(asset.title)
      .split(" ")
      .filter((token) => token.length > 2);
    return tokens.length > 0 && tokens.every((token) => normalizedRequest.includes(token));
  });

  if (matchingAssets.length === 1 && folder) {
    return {
      assetId: matchingAssets[0].id,
      folderId: folder.id,
    };
  }

  return null;
}

function isAmbiguousSave(request: string) {
  return /^\s*save (this|it)\.?\s*$/i.test(request);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstNonEmpty(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function stringPatch(source: unknown, keys: string[]) {
  if (!isRecord(source)) {
    return {};
  }

  return Object.fromEntries(
    keys
      .map((key) => [key, firstNonEmpty(source[key])] as const)
      .filter(([, value]) => value),
  );
}

function stringList(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim());
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\n|,/)
      .map((item) => item.replace(/^[-*\d.\s]+/, "").trim())
      .filter(Boolean);
  }

  return [];
}

function parseJsonObject(text: string) {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fencedMatch?.[1] ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(source || "{}") as Record<string, unknown>;
}

function fallbackPositioningPatch(request: string) {
  const coreAngle = firstNonEmpty(
    request.match(/SceneBook is basically\s+(.*?)(?:\.|\n)/i)?.[1],
    request.match(/SceneBook is\s+(.*?)(?:\.|\n)/i)?.[1],
    "the AI production workspace for short-form creators",
  );
  const hook = firstNonEmpty(
    request.match(/Every creator has[^.\n!?]*[.!?]?/i)?.[0],
    request.match(/I(?:'|')?m building[^.\n!?]*[.!?]?/i)?.[0],
    "Every creator has 100 ideas and zero system.",
  );
  const cta = firstNonEmpty(
    request.match(/Start with a raw idea[^.\n!?]*[.!?]?/i)?.[0],
    "Follow the build as SceneBook becomes the creative OS for short-form creators.",
  );

  return {
    creativeBrief: {
      audience: "solo and small-team short-form creators",
      platform: "instagram",
      format: "reel",
      tone: "sharp, creative, cinematic, creator-native",
      coreAngle: coreAngle ? `SceneBook is ${coreAngle.replace(/^an?\s+/i, "")}` : undefined,
      viewerPromise: "Turn messy ideas into finished short-form videos without scattered tools.",
      visualStyle: "clean, fast, visual, tasteful, modern, slightly cinematic",
      cta,
    },
    scriptLab: {
      angle: "SceneBook as the creator operating system for short-form video builders.",
      hook,
      cta,
      notes: "SceneBook is not a generic AI content generator; it is an end-to-end project workspace for the creator workflow.",
    },
    goal: {
      title: "Turn updated SceneBook positioning into a launch reel",
      stage: "scripting",
      completedSteps: ["positioning"],
      nextActions: ["Draft the launch reel script", "Plan the shot list", "Generate asset prompts"],
      blockers: [],
    },
  };
}

function normalizePositioningPatch(raw: unknown, request: string) {
  const fallback = fallbackPositioningPatch(request);
  const source = isRecord(raw) ? raw : {};
  const rawGoal = isRecord(source.goal) ? source.goal : {};
  const stage = firstNonEmpty(rawGoal.stage);

  return {
    creativeBrief: {
      ...fallback.creativeBrief,
      ...stringPatch(source.creativeBrief, [
        "audience",
        "platform",
        "format",
        "tone",
        "coreAngle",
        "viewerPromise",
        "visualStyle",
        "cta",
      ]),
      openQuestions: stringList(isRecord(source.creativeBrief) ? source.creativeBrief.openQuestions : undefined),
    },
    scriptLab: {
      ...fallback.scriptLab,
      ...stringPatch(source.scriptLab, ["angle", "hook", "cta", "notes"]),
    },
    goal: {
      ...fallback.goal,
      title: firstNonEmpty(rawGoal.title, fallback.goal.title),
      stage: stage && goalStages.has(stage) ? stage : fallback.goal.stage,
      completedSteps: stringList(rawGoal.completedSteps).length > 0
        ? stringList(rawGoal.completedSteps)
        : fallback.goal.completedSteps,
      nextActions: stringList(rawGoal.nextActions).length > 0
        ? stringList(rawGoal.nextActions)
        : fallback.goal.nextActions,
      blockers: stringList(rawGoal.blockers),
    },
  };
}

async function extractPositioningPatch(input: WorkflowHandlerInput, request: string) {
  try {
    const response = await generateText({
      prompt: [
        "Extract a SceneBook workspace patch from the user's product-positioning correction.",
        "Return strict JSON only with this shape:",
        "{ creativeBrief: { audience, platform, format, tone, coreAngle, viewerPromise, visualStyle, cta, openQuestions }, scriptLab: { angle, hook, cta, notes }, goal: { title, stage, completedSteps, nextActions, blockers } }",
        "Use the user's own language when possible. Choose one practical reel hook and one CTA from the correction if present.",
        "Allowed goal stages: ideating, briefing, scripting, asset_planning, generating_assets, editing, publishing, analyzing, complete.",
        `Current project: ${input.snapshot.project.title} (${input.snapshot.project.platform} ${input.snapshot.project.format}, ${input.snapshot.project.status})`,
        `Current script lab: ${JSON.stringify(input.snapshot.scriptLab)}`,
        `User correction:\n${request}`,
      ].join("\n\n"),
      systemInstruction: "You convert creator-product positioning into concise SceneBook workspace fields. Return JSON only.",
      modelOverride: input.context.selectedModels?.chat,
    });

    return normalizePositioningPatch(parseJsonObject(response), request);
  } catch {
    return normalizePositioningPatch({}, request);
  }
}

function looksLikePositioningUpdate(request: string, mode: unknown) {
  if (mode === "positioning_update") {
    return true;
  }

  return /\bscenebook\b/i.test(request)
    && /\b(change this|something completely different|product thesis|creator os|creator operating system|production workspace)\b/i.test(request);
}

async function runTool(input: WorkflowHandlerInput, toolName: string, rawInput: unknown) {
  return executeRuntimeV3Tool({
    toolName,
    rawInput,
    context: input.context,
    snapshot: input.snapshot,
    stream: input.stream,
  });
}

function askTarget() {
  return {
    waitingForUser: true,
    observations: [],
    finalResponse: "What should I save this as: hook, script, caption, CTA, shoot task, folder, or artifact?",
  };
}

function outputRecord(observation: { output?: Record<string, unknown> }) {
  return isRecord(observation.output) ? observation.output : {};
}

function errorRecord(observation: { output?: Record<string, unknown> }) {
  const output = outputRecord(observation);
  return isRecord(output.error) ? output.error : {};
}

function failureReason(observation: { message: string; output?: Record<string, unknown> }) {
  const output = outputRecord(observation);
  const error = errorRecord(observation);

  return firstNonEmpty(error.message, output.message, observation.message) ?? "Unknown failure.";
}

function retrySafe(observation: { output?: Record<string, unknown> }) {
  const error = errorRecord(observation);
  return typeof error.recoverable === "boolean" ? error.recoverable : false;
}

function summarizePartialUpdate(observations: WorkflowResult["observations"]) {
  const successful = observations.filter((observation) => observation.status === "completed");
  const failed = observations.filter((observation) => observation.status !== "completed");
  const retryIsSafe = failed.length > 0 && failed.every(retrySafe);
  const failedReasons = failed.map(failureReason).join("; ");

  return [
    "Partial update: some workspace changes completed, but the full operation did not.",
    `Successful: ${successful.length > 0 ? successful.map((item) => item.toolName).join(", ") : "none"}.`,
    `Failed: ${failed.length > 0 ? failed.map((item) => item.toolName).join(", ") : "none"}.`,
    failedReasons ? `Reason: ${failedReasons}.` : null,
    `Retry safe: ${retryIsSafe ? "yes" : "no"}.`,
    "I did not mark the whole operation as succeeded; the tool cards show which mutations were verified.",
  ].filter(Boolean).join(" ");
}

async function runPositioningUpdate(input: WorkflowHandlerInput, request: string): Promise<WorkflowResult> {
  const patch = await extractPositioningPatch(input, request);
  const observations = [
    await runTool(input, "update_creative_brief", patch.creativeBrief),
    await runTool(input, "update_script_lab", patch.scriptLab),
    await runTool(input, "update_active_goal", patch.goal),
  ];
  const failed = observations.filter((observation) => observation.status !== "completed");

  if (failed.length > 0) {
    return {
      observations,
      finalResponse: summarizePartialUpdate(observations),
    };
  }

  return {
    observations,
    finalResponse: "SceneBook positioning updated: creative brief, hook/CTA, and active goal were saved and verified. The tool cards show the exact workspace changes.",
  };
}

export async function runWorkspaceControlWorkflow(input: WorkflowHandlerInput): Promise<WorkflowResult> {
  const request = workflowRequest(input);
  const object = workflowObject(input);

  if (typeof object.assetId === "string" && typeof object.folderId === "string") {
    const observation = await runTool(input, "move_asset_to_folder", {
      assetId: object.assetId,
      folderId: object.folderId,
    });
    return {
      observations: [observation],
      finalResponse: observation.status === "completed"
        ? "Asset moved and verified in the target folder."
      : `I could not move the asset: ${observation.message}`,
    };
  }

  const resolvedMove = resolveAssetMove(input, request);
  if (resolvedMove) {
    const observation = await runTool(input, "move_asset_to_folder", resolvedMove);
    return {
      observations: [observation],
      finalResponse: observation.status === "completed"
        ? "Asset moved and verified in the target folder."
        : `I could not move the asset: ${observation.message}`,
    };
  }

  if (isAmbiguousSave(request)) {
    return askTarget();
  }

  if (looksLikePositioningUpdate(request, object.mode)) {
    return runPositioningUpdate(input, request);
  }

  const hook = extractAfter(/(?:make this(?: the)? hook|use this as(?: the)? hook|hook)\s*:\s*(.+)$/i, request);
  if (hook) {
    const observation = await runTool(input, "update_script_lab", { hook });
    return {
      observations: [observation],
      finalResponse: observation.status === "completed"
        ? "Hook changed and verified in Script Lab."
        : `I could not save the hook: ${observation.message}`,
    };
  }

  const cta = extractAfter(/(?:make this(?: the)? cta|use this as(?: the)? cta|cta)\s*:\s*(.+)$/i, request);
  if (cta) {
    const observation = await runTool(input, "update_script_lab", { cta });
    return {
      observations: [observation],
      finalResponse: observation.status === "completed"
        ? "CTA changed and verified in Script Lab."
        : `I could not save the CTA: ${observation.message}`,
    };
  }

  const caption = extractAfter(/(?:make this(?: the)? caption|use this as(?: the)? caption|caption)\s*:\s*(.+)$/i, request);
  if (caption) {
    const observation = await runTool(input, "update_script_lab", { caption });
    return {
      observations: [observation],
      finalResponse: observation.status === "completed"
        ? "Caption changed and verified in Script Lab."
        : `I could not save the caption: ${observation.message}`,
    };
  }

  const script = extractAfter(/(?:make this(?: the)? script|use this as(?: the)? script|script)\s*:\s*([\s\S]+)$/i, request);
  if (script) {
    const observation = await runTool(input, "update_script_lab", { script });
    return {
      observations: [observation],
      finalResponse: observation.status === "completed"
        ? "Script text changed and verified in Script Lab."
        : `I could not save the script text: ${observation.message}`,
    };
  }

  const tasks = parseShootTasks(request);
  if (tasks) {
    const observation = await runTool(input, "update_shoot_pack", { category: "aRoll", tasks });
    return {
      observations: [observation],
      finalResponse: observation.status === "completed"
        ? "Shoot tasks added and verified."
        : `I could not add the shoot tasks: ${observation.message}`,
    };
  }

  const folder = extractAfter(/(?:create|make|add)(?: an?)? (?:asset )?folder(?: named| called)?\s+([^.!?]+)$/i, request);
  if (folder) {
    const observation = await runTool(input, "create_asset_folder", { name: folder });
    return {
      observations: [observation],
      finalResponse: observation.status === "completed"
        ? "Asset folder is ready."
        : `I could not create the folder: ${observation.message}`,
    };
  }

  if (/\bmove\b.*\basset\b.*\bto\b/i.test(request)) {
    return {
      waitingForUser: true,
      observations: [],
      finalResponse: "Which asset should I move, and which exact folder should it go to?",
    };
  }

  if (/\b(instagram package|publish package|prepare instagram)\b/i.test(request)) {
    const observation = await runTool(input, "prepare_instagram_package", { request });
    return {
      observations: [observation],
      finalResponse: observation.status === "completed"
        ? "Instagram package prepared. Nothing was published."
        : `I could not prepare the Instagram package: ${observation.message}`,
    };
  }

  return askTarget();
}
