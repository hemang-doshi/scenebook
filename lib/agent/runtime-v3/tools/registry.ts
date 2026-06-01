/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";

import { generateText } from "@/lib/ai/client";
import {
  createAssetFolder,
  getProjectAssetLibrary,
  listProjectAssetFolders,
  moveAssetToFolder,
} from "@/lib/assets/asset-folders";
import { createProjectArtifact } from "@/lib/agent/artifacts";
import { createMemorySnapshot } from "@/lib/agent/memory";
import { loadCreativeBrief, upsertCreativeBrief } from "@/lib/agent/runtime-v3/memory/creative-brief-store";
import { upsertActiveGoal } from "@/lib/agent/runtime-v3/memory/goal-store";
import { createScriptVersion, loadScriptVersion } from "@/lib/agent/runtime-v3/memory/script-version-store";
import { normalizePromptJsonOutput } from "@/lib/agent/tools/structured-output";
import { getProjectWorkspace, updateCard } from "@/lib/data/repository";
import { generateProjectMedia } from "@/lib/generation/generate-media";
import type { AgentTool } from "@/lib/agent/runtime-v3/types";
import type { PromptJsonOutput } from "@/lib/agent/types";
import type { ChecklistItem, JsonValue } from "@/lib/types";

const jsonObjectSchema = z.record(z.string(), z.any()) as z.ZodType<Record<string, JsonValue>>;
const creativeBriefTable = "project_creative_briefs";

function toJsonObject(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? {})) as Record<string, JsonValue>;
}

function jsonEqual(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function extractJsonObject(text: string) {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const source = fencedMatch?.[1] ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(source || "{}") as Record<string, unknown>;
}

function normalizeStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\n+/)
      .map((item) => item.replace(/^[-*\d.\s]+/, "").trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeScriptPackage(value: Record<string, unknown>) {
  const source = typeof value.scriptLab === "object" && value.scriptLab !== null && !Array.isArray(value.scriptLab)
    ? value.scriptLab as Record<string, unknown>
    : value;
  return {
    hook: typeof source.hook === "string" ? source.hook : "",
    outline: normalizeStringList(source.outline).join("\n"),
    script: typeof source.script === "string" ? source.script : "",
    caption: typeof source.caption === "string" ? source.caption : "",
    cta: typeof source.cta === "string" ? source.cta : "",
    onScreenText: normalizeStringList(source.onScreenText).join("\n"),
  };
}

function renderPromptJson(promptJson: PromptJsonOutput) {
  const lines = [promptJson.prompt];
  const sections = [
    ["Subject", promptJson.subject],
    ["Scene", promptJson.scene],
    ["Camera", promptJson.camera],
    ["Lighting", promptJson.lighting],
    ["Style", promptJson.style],
    ["Output", promptJson.output],
  ] as const;

  for (const [label, value] of sections) {
    if (!value) {
      continue;
    }
    const text = Object.values(value)
      .filter((entry) => typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean")
      .map((entry) => String(entry).trim())
      .filter(Boolean)
      .join("; ");
    if (text) {
      lines.push(`${label}: ${text}`);
    }
  }

  return lines.filter(Boolean).join("\n");
}

function checklist(label: string): ChecklistItem {
  return {
    id: crypto.randomUUID(),
    label,
    done: false,
  };
}

const generateScriptPackageInput = z.object({
  prompt: z.string().trim().min(1),
  mode: z.enum(["new", "rewrite"]).default("new"),
  currentScript: z.string().optional(),
  creativeBrief: jsonObjectSchema.optional(),
});

const generateScriptPackageTool: AgentTool<z.infer<typeof generateScriptPackageInput>> = {
  name: "generate_script_package",
  displayName: "Generate Script Package",
  description: "Generates a structured script package without mutating the workspace.",
  inputSchema: generateScriptPackageInput,
  outputSchema: jsonObjectSchema,
  sideEffect: "none",
  approvalPolicy: "auto",
  availability: "available",
  async handler(ctx, input) {
    const response = await generateText({
      prompt: [
        "Return only JSON for a SceneBook Script Lab package.",
        "Required keys: hook, outline, script, caption, cta, onScreenText.",
        `Mode: ${input.mode}`,
        `Project: ${ctx.snapshot.project.title} (${ctx.snapshot.project.platform} ${ctx.snapshot.project.format})`,
        `Creative brief: ${JSON.stringify(input.creativeBrief ?? ctx.snapshot.creativeBrief ?? {})}`,
        input.currentScript ? `Current script:\n${input.currentScript}` : "",
        `User request:\n${input.prompt}`,
      ].filter(Boolean).join("\n\n"),
      systemInstruction: "You write concise, high-retention short-form video script packages. Return strict JSON only.",
      modelOverride: ctx.selectedModels?.chat,
    });
    const parsed = normalizeScriptPackage(extractJsonObject(response));

    if (!parsed.script.trim() || !parsed.hook.trim()) {
      throw new Error("Generated script package was missing required script fields.");
    }

    return {
      message: "Script package generated.",
      output: {
        kind: "script_package",
        mode: input.mode,
        ...parsed,
      },
    };
  },
};

const generatePromptJsonInput = z.object({
  prompt: z.string().trim().min(1),
  modality: z.enum(["image", "video", "audio"]).default("image"),
});

const generatePromptJsonTool: AgentTool<z.infer<typeof generatePromptJsonInput>> = {
  name: "generate_prompt_json",
  displayName: "Generate Prompt JSON",
  description: "Expands an asset request into structured generation prompt JSON without mutating the workspace.",
  inputSchema: generatePromptJsonInput,
  outputSchema: jsonObjectSchema,
  sideEffect: "none",
  approvalPolicy: "auto",
  availability: "available",
  async handler(ctx, input) {
    const response = await generateText({
      prompt: [
        "Return only JSON for a SceneBook media generation prompt.",
        "Required keys: modality, prompt, aspect_ratio, subject, scene, camera, lighting, style, output.",
        "Use 9:16 by default for Instagram/Reels unless the user asks otherwise.",
        `Requested modality: ${input.modality}`,
        `Project: ${ctx.snapshot.project.title} (${ctx.snapshot.project.platform} ${ctx.snapshot.project.format})`,
        `Creative brief: ${JSON.stringify(ctx.snapshot.creativeBrief ?? {})}`,
        `User asset request:\n${input.prompt}`,
      ].join("\n\n"),
      systemInstruction: "You create precise media-generation prompt JSON. Return strict JSON only.",
      modelOverride: ctx.selectedModels?.chat,
    });
    const promptJson = normalizePromptJsonOutput({
      ...extractJsonObject(response),
      modality: input.modality,
    });

    return {
      message: "Prompt JSON generated.",
      output: toJsonObject(promptJson),
    };
  },
};

const critiqueScriptInput = z.object({
  script: z.string().trim().min(1),
  request: z.string().optional(),
});

const critiqueScriptTool: AgentTool<z.infer<typeof critiqueScriptInput>> = {
  name: "critique_script",
  displayName: "Critique Script",
  description: "Critiques a script draft without mutating the workspace.",
  inputSchema: critiqueScriptInput,
  outputSchema: jsonObjectSchema,
  sideEffect: "none",
  approvalPolicy: "auto",
  availability: "available",
  async handler(ctx, input) {
    const response = await generateText({
      prompt: [
        "Critique this short-form script for hook strength, clarity, pacing, and save-worthy next actions.",
        `Project: ${ctx.snapshot.project.title}`,
        `Request: ${input.request ?? ctx.rawInput}`,
        `Script:\n${input.script}`,
      ].join("\n\n"),
      systemInstruction: "Be direct, specific, and concise. Do not claim any workspace changes.",
      modelOverride: ctx.selectedModels?.chat,
    });

    return {
      message: "Script critique completed.",
      output: {
        kind: "script_critique",
        critique: response.trim(),
      },
    };
  },
};

const createScriptVersionInput = z.object({
  title: z.string().trim().min(1),
  scriptLab: jsonObjectSchema,
  active: z.boolean().default(true),
  metadata: jsonObjectSchema.optional(),
});

const createScriptVersionTool: AgentTool<z.infer<typeof createScriptVersionInput>> = {
  name: "create_script_version",
  displayName: "Create Script Version",
  description: "Stores a canonical Script Lab version record.",
  inputSchema: createScriptVersionInput,
  outputSchema: jsonObjectSchema,
  sideEffect: "db_write",
  approvalPolicy: "auto",
  availability: "available",
  async handler(ctx, input) {
    const version = await createScriptVersion({
      ownerId: ctx.userId,
      projectId: ctx.projectId,
      threadId: ctx.threadId,
      toolCallId: ctx.toolCallId ?? null,
      title: input.title,
      scriptLab: input.scriptLab,
      active: input.active,
      metadata: input.metadata,
    });

    return {
      message: "Script version created.",
      output: {
        kind: "script_version",
        versionId: version.id,
        title: version.title,
        active: version.active,
      },
    };
  },
  async verify(ctx, result) {
    const versionId = result.output.versionId;
    if (typeof versionId !== "string") {
      return { verified: false, message: "Script version output did not include a version id." };
    }

    const version = await loadScriptVersion({ projectId: ctx.projectId, versionId });
    const verified = Boolean(version && version.id === versionId && version.active === result.output.active);
    return {
      verified,
      evidence: {
        versionId,
        active: version?.active ?? null,
      },
      message: verified ? "Re-read script version and confirmed it exists." : "Script version could not be re-read.",
    };
  },
};

const updateScriptLabInput = z.object({
  hook: z.string().optional(),
  outline: z.string().optional(),
  script: z.string().optional(),
  caption: z.string().optional(),
  cta: z.string().optional(),
  onScreenText: z.string().optional(),
  notes: z.string().optional(),
  overwrite: z.boolean().optional(),
});

const updateScriptLabTool: AgentTool<z.infer<typeof updateScriptLabInput>> = {
  name: "update_script_lab",
  displayName: "Update Script Lab",
  description: "Safely updates selected Script Lab fields and verifies persistence.",
  inputSchema: updateScriptLabInput,
  outputSchema: jsonObjectSchema,
  sideEffect: "db_write",
  approvalPolicy: "ask_if_overwrite",
  availability: "available",
  async handler(ctx, input) {
    const project = await getProjectWorkspace(ctx.projectId);
    if (!project) {
      throw new Error("Project not found.");
    }

    const patch = Object.fromEntries(
      Object.entries(input).filter(([key, value]) => key !== "overwrite" && value !== undefined),
    );

    if (Object.keys(patch).length === 0) {
      throw new Error("No Script Lab fields were provided.");
    }

    await updateCard(ctx.projectId, {
      scriptLab: {
        ...project.scriptLab,
        ...patch,
      },
    });

    return {
      message: "Script Lab updated.",
      output: {
        kind: "script_lab_update",
        changedFields: Object.keys(patch),
        patch: toJsonObject(patch),
      },
    };
  },
  async verify(ctx, result) {
    const project = await getProjectWorkspace(ctx.projectId);
    const patch = result.output.patch;
    if (!project || !patch || typeof patch !== "object" || Array.isArray(patch)) {
      return { verified: false, message: "Unable to re-read Script Lab." };
    }

    const changedFields = Object.keys(patch);
    const verified = changedFields.every((field) => {
      const expected = (patch as Record<string, JsonValue>)[field];
      return project.scriptLab[field as keyof typeof project.scriptLab] === expected;
    });

    return {
      verified,
      evidence: {
        changedFields,
      },
      message: verified ? "Re-read Script Lab and confirmed changed fields." : "Script Lab re-read did not match patch.",
    };
  },
};

const updateShootPackInput = z.object({
  category: z.enum(["aRoll", "bRoll", "screenCaptures", "props", "missingAssets"]).default("aRoll"),
  tasks: z.array(z.string().trim().min(1)).min(1),
});

const updateShootPackTool: AgentTool<z.infer<typeof updateShootPackInput>> = {
  name: "update_shoot_pack",
  displayName: "Update Shoot Pack",
  description: "Adds checklist items to the shoot pack.",
  inputSchema: updateShootPackInput,
  outputSchema: jsonObjectSchema,
  sideEffect: "db_write",
  approvalPolicy: "auto",
  availability: "available",
  async handler(ctx, input) {
    const project = await getProjectWorkspace(ctx.projectId);
    if (!project) {
      throw new Error("Project not found.");
    }

    const nextItems = [...project.shootPack[input.category], ...input.tasks.map(checklist)];
    await updateCard(ctx.projectId, {
      shootPack: {
        ...project.shootPack,
        [input.category]: nextItems,
      },
    });

    return {
      message: "Shoot pack updated.",
      output: {
        kind: "shoot_pack_update",
        category: input.category,
        addedTasks: input.tasks,
      },
    };
  },
  async verify(ctx, result) {
    const project = await getProjectWorkspace(ctx.projectId);
    const category = result.output.category;
    const addedTasks = result.output.addedTasks;
    if (
      !project ||
      typeof category !== "string" ||
      !Array.isArray(addedTasks) ||
      !(category in project.shootPack)
    ) {
      return { verified: false, message: "Unable to re-read shoot pack." };
    }

    const items = project.shootPack[category as keyof typeof project.shootPack];
    if (!Array.isArray(items)) {
      return { verified: false, message: "Shoot pack category is not a checklist." };
    }

    const labels = items.map((item: ChecklistItem) => item.label);
    const verified = addedTasks.every((task) => typeof task === "string" && labels.includes(task));
    return {
      verified,
      evidence: { category, addedTasks },
      message: verified ? "Re-read shoot pack and confirmed tasks." : "Shoot pack re-read did not include every task.",
    };
  },
};

const createAssetFolderInput = z.object({
  name: z.string().trim().min(1),
});

const createAssetFolderTool: AgentTool<z.infer<typeof createAssetFolderInput>> = {
  name: "create_asset_folder",
  displayName: "Create Asset Folder",
  description: "Creates or reuses a top-level project asset folder.",
  inputSchema: createAssetFolderInput,
  outputSchema: jsonObjectSchema,
  sideEffect: "db_write",
  approvalPolicy: "auto",
  availability: "available",
  async handler(ctx, input) {
    const existing = await listProjectAssetFolders(ctx.projectId);
    const folder = existing.find((candidate) => candidate.name.toLowerCase() === input.name.toLowerCase() && !candidate.parent_id)
      ?? await createAssetFolder(ctx.projectId, input.name, null);

    return {
      message: existing.some((candidate) => candidate.id === folder.id)
        ? "Asset folder already exists."
        : "Asset folder created.",
      output: {
        kind: "asset_folder",
        folderId: folder.id,
        folderName: folder.name,
      },
    };
  },
  async verify(ctx, result) {
    const folders = await listProjectAssetFolders(ctx.projectId);
    const folderId = result.output.folderId;
    const verified = folders.some((folder) => folder.id === folderId);
    return {
      verified,
      evidence: { folderId: typeof folderId === "string" ? folderId : null },
    };
  },
};

const moveAssetInput = z.object({
  assetId: z.string().min(1),
  folderId: z.string().min(1),
});

const moveAssetTool: AgentTool<z.infer<typeof moveAssetInput>> = {
  name: "move_asset_to_folder",
  displayName: "Move Asset To Folder",
  description: "Moves an asset into an existing project folder.",
  inputSchema: moveAssetInput,
  outputSchema: jsonObjectSchema,
  sideEffect: "db_write",
  approvalPolicy: "auto",
  availability: "available",
  async handler(ctx, input) {
    await moveAssetToFolder(ctx.projectId, input.assetId, input.folderId);
    return {
      message: "Asset moved.",
      output: {
        kind: "asset_move",
        assetId: input.assetId,
        folderId: input.folderId,
      },
    };
  },
  async verify(ctx, result) {
    const assetId = result.output.assetId;
    const folderId = result.output.folderId;
    const library = await getProjectAssetLibrary(ctx.projectId);
    const verified = library.folders.some(
      (folder) => folder.id === folderId && folder.assets.some((asset) => asset.id === assetId),
    );
    return {
      verified,
      evidence: {
        assetId: typeof assetId === "string" ? assetId : null,
        folderId: typeof folderId === "string" ? folderId : null,
      },
      message: verified ? "Re-read asset library and confirmed folder placement." : "Asset was not found in target folder.",
    };
  },
};

const generateMediaInput = z.object({
  prompt: z.string().trim().min(1),
  modality: z.enum(["image", "video", "audio"]).default("image"),
  folderId: z.string().optional(),
  title: z.string().optional(),
  structuredPrompt: jsonObjectSchema.optional(),
  negativePrompt: z.string().optional(),
  parameters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const generateMediaTool: AgentTool<z.infer<typeof generateMediaInput>> = {
  name: "generate_media_asset",
  displayName: "Generate Media Asset",
  description: "Generates and saves a project media asset.",
  inputSchema: generateMediaInput,
  outputSchema: jsonObjectSchema,
  sideEffect: "asset_generation",
  approvalPolicy: "auto",
  availability: "available",
  async handler(ctx, input) {
    const modelId = ctx.selectedModels?.[input.modality] ?? null;
    const promptJson = input.structuredPrompt
      ? normalizePromptJsonOutput({
          ...input.structuredPrompt,
          modality: input.modality,
          prompt: input.prompt,
        })
      : null;
    const finalPrompt = promptJson ? renderPromptJson(promptJson) : input.prompt;
    const result = await generateProjectMedia({
      projectId: ctx.projectId,
      userId: ctx.userId,
      prompt: finalPrompt,
      modality: input.modality,
      modelId: modelId ?? undefined,
      title: input.title,
      folderId: input.folderId,
      structuredPrompt: promptJson ? toJsonObject(promptJson) : input.structuredPrompt,
      negativePrompt: input.negativePrompt ?? promptJson?.negative_prompt,
      parameters: input.parameters ?? promptJson?.parameters,
    });

    return {
      message: `${input.modality.toUpperCase()} generated successfully.`,
      output: {
        kind: "media_asset",
        assetId: result.assetId,
        generationId: result.generationId,
        url: result.url,
        folderId: result.folderId,
        folderName: result.folderName,
        model: result.model,
        provider: result.provider,
        prompt: result.prompt,
        modality: input.modality,
        title: input.title ?? `${input.modality} concept`,
        negative_prompt: input.negativePrompt ?? promptJson?.negative_prompt ?? null,
        parameters: input.parameters ?? promptJson?.parameters ?? null,
      },
    };
  },
  async verify(ctx, result) {
    const assetId = result.output.assetId;
    const folderId = result.output.folderId;
    const library = await getProjectAssetLibrary(ctx.projectId);
    const inFolder = typeof folderId === "string"
      ? library.folders.some((folder) => folder.id === folderId && folder.assets.some((asset) => asset.id === assetId))
      : false;
    const loose = library.looseAssets.some((asset) => asset.id === assetId);
    const verified = inFolder || loose;
    return {
      verified,
      evidence: {
        assetId: typeof assetId === "string" ? assetId : null,
        folderId: typeof folderId === "string" ? folderId : null,
        folderVerified: inFolder,
      },
      message: verified ? "Re-read asset library and confirmed saved asset." : "Generated asset was not found in the asset library.",
    };
  },
};

const artifactInput = z.object({
  artifactType: z.string().trim().min(1),
  title: z.string().trim().min(1),
  payload: jsonObjectSchema,
  metadata: jsonObjectSchema.optional(),
});

const createArtifactTool: AgentTool<z.infer<typeof artifactInput>> = {
  name: "create_project_artifact",
  displayName: "Create Project Artifact",
  description: "Creates a structured project artifact.",
  inputSchema: artifactInput,
  outputSchema: jsonObjectSchema,
  sideEffect: "db_write",
  approvalPolicy: "auto",
  availability: "available",
  async handler(ctx, input) {
    const toolCallId = ctx.toolCallId;
    if (!toolCallId) {
      throw new Error("Project artifacts must be created from a recorded tool call.");
    }
    const artifact = await createProjectArtifact({
      projectId: ctx.projectId,
      threadId: ctx.threadId,
      toolCallId,
      artifactType: input.artifactType,
      title: input.title,
      payload: input.payload,
      metadata: input.metadata,
    });

    return {
      message: "Project artifact created.",
      output: {
        kind: "project_artifact",
        artifactId: artifact.id as string,
        artifactType: input.artifactType,
        title: input.title,
      },
    };
  },
};

const activeGoalInput = z.object({
  title: z.string().trim().min(1),
  stage: z.enum([
    "ideating",
    "briefing",
    "scripting",
    "asset_planning",
    "generating_assets",
    "editing",
    "publishing",
    "analyzing",
    "complete",
  ]),
  completedSteps: z.array(z.string()).optional(),
  nextActions: z.array(z.string()).optional(),
  blockers: z.array(z.string()).optional(),
});

const updateActiveGoalTool: AgentTool<z.infer<typeof activeGoalInput>> = {
  name: "update_active_goal",
  displayName: "Update Active Goal",
  description: "Creates or updates the active project goal.",
  inputSchema: activeGoalInput,
  outputSchema: jsonObjectSchema,
  sideEffect: "db_write",
  approvalPolicy: "auto",
  availability: "available",
  async handler(ctx, input) {
    const existing = ctx.snapshot.activeGoal?.id;
    const goal = await upsertActiveGoal({
      ownerId: ctx.userId,
      projectId: ctx.projectId,
      threadId: ctx.threadId,
      currentGoalId: existing,
      goal: {
        title: input.title,
        status: input.stage === "complete" ? "complete" : "active",
        stage: input.stage,
        completedSteps: input.completedSteps ?? ctx.snapshot.activeGoal?.completedSteps ?? [],
        nextActions: input.nextActions ?? ctx.snapshot.activeGoal?.nextActions ?? [],
        blockers: input.blockers ?? ctx.snapshot.activeGoal?.blockers ?? [],
        metadata: {},
      },
    });

    return {
      message: "Active goal updated.",
      output: {
        kind: "active_goal",
        goalId: goal.id as string,
        title: input.title,
        stage: input.stage,
        nextActions: input.nextActions ?? [],
      },
    };
  },
};

const creativeBriefInput = z.object({
  audience: z.string().optional(),
  platform: z.string().optional(),
  format: z.string().optional(),
  durationSeconds: z.number().optional(),
  tone: z.string().optional(),
  coreAngle: z.string().optional(),
  viewerPromise: z.string().optional(),
  visualStyle: z.string().optional(),
  cta: z.string().optional(),
  openQuestions: z.array(z.string()).optional(),
});

const updateCreativeBriefTool: AgentTool<z.infer<typeof creativeBriefInput>> = {
  name: "update_creative_brief",
  displayName: "Update Creative Brief",
  description: "Upserts canonical creative brief fields.",
  inputSchema: creativeBriefInput,
  outputSchema: jsonObjectSchema,
  sideEffect: "db_write",
  approvalPolicy: "auto",
  availability: "available",
  async handler(ctx, input) {
    const patch = Object.fromEntries(
      Object.entries(input).filter(([, value]) => value !== undefined),
    );
    if (Object.keys(patch).length === 0) {
      throw new Error("No Creative Brief fields were provided.");
    }

    const brief = await upsertCreativeBrief({
      ownerId: ctx.userId,
      projectId: ctx.projectId,
      patch,
    });

    return {
      message: "Creative brief updated.",
      output: {
        kind: "creative_brief",
        changedFields: Object.keys(patch),
        patch: toJsonObject(patch),
        brief: toJsonObject(brief),
      },
    };
  },
  async verify(ctx, result) {
    const patch = result.output.patch;
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
      const evidence: Record<string, JsonValue> = {
        projectId: ctx.projectId,
        table: creativeBriefTable,
        operation: "verify_update",
      };
      return {
        verified: false,
        evidence,
        message: "Creative brief output did not include a patch to verify.",
      };
    }

    const persisted = await loadCreativeBrief(ctx.projectId, {
      throwOnError: true,
      operation: "verify_update",
    });
    if (!persisted) {
      const evidence: Record<string, JsonValue> = {
        projectId: ctx.projectId,
        table: creativeBriefTable,
        operation: "verify_update",
        changedFields: Object.keys(patch),
      };
      return {
        verified: false,
        evidence,
        message: "Creative brief could not be re-read after update.",
      };
    }

    const changedFields = Object.keys(patch);
    const mismatches = changedFields.filter((field) => {
      const expected = (patch as Record<string, JsonValue>)[field];
      const actual = persisted[field as keyof typeof persisted];
      return !jsonEqual(actual, expected);
    });

    const evidence: Record<string, JsonValue> = {
      projectId: ctx.projectId,
      table: creativeBriefTable,
      operation: "verify_update",
      changedFields,
      mismatches,
    };

    return {
      verified: mismatches.length === 0,
      evidence,
      message: mismatches.length === 0
        ? "Re-read creative brief and confirmed changed fields."
        : "Creative brief re-read did not match patch.",
    };
  },
};

const writeEditorTimelineTool: AgentTool<{ request?: string }> = {
  name: "write_editor_timeline",
  displayName: "Write Editor Timeline",
  description: "Directly mutates the editor timeline. This integration is not wired yet.",
  inputSchema: z.object({ request: z.string().optional() }),
  outputSchema: jsonObjectSchema,
  sideEffect: "editor_write",
  approvalPolicy: "always",
  availability: "requires_integration",
  handler() {
    throw new Error("Editor timeline writes require an editor integration.");
  },
};

const publishToInstagramTool: AgentTool<{ request?: string }> = {
  name: "publish_to_instagram",
  displayName: "Publish To Instagram",
  description: "Publishes externally to Instagram. This integration is not wired yet.",
  inputSchema: z.object({ request: z.string().optional() }),
  outputSchema: jsonObjectSchema,
  sideEffect: "publish",
  approvalPolicy: "always",
  availability: "requires_integration",
  handler() {
    throw new Error("Instagram publishing requires a publishing integration.");
  },
};

const prepareEditorHandoffTool: AgentTool<{ request?: string }> = {
  name: "prepare_editor_handoff",
  displayName: "Prepare Editor Handoff",
  description: "Creates an editor handoff artifact without mutating the timeline.",
  inputSchema: z.object({ request: z.string().optional() }),
  outputSchema: jsonObjectSchema,
  sideEffect: "db_write",
  approvalPolicy: "auto",
  availability: "available",
  async handler(ctx, input) {
    const payload = {
      kind: "editor_handoff",
      summary: `Prepare ${ctx.snapshot.project.title} for editing.`,
      request: input.request ?? ctx.rawInput,
      timelineMutationAvailable: false,
      sequence: [
        "Open with the strongest hook visual.",
        "Lay script beats as edit markers.",
        "Use generated or selected assets as supporting visuals.",
        "Export a rough cut for review.",
      ],
      assets: ctx.snapshot.assets.recent,
    };

    await createMemorySnapshot({
      projectId: ctx.projectId,
      threadId: ctx.threadId,
      summary: "Prepared editor handoff artifact.",
      metadata: payload,
    });

    return {
      message: "Editor handoff prepared.",
      output: payload,
    };
  },
};

const prepareInstagramPackageTool: AgentTool<{ request?: string }> = {
  name: "prepare_instagram_package",
  displayName: "Prepare Instagram Package",
  description: "Creates an Instagram publish-prep package. Actual publishing is unavailable here.",
  inputSchema: z.object({ request: z.string().optional() }),
  outputSchema: jsonObjectSchema,
  sideEffect: "db_write",
  approvalPolicy: "auto",
  availability: "available",
  async handler(ctx, input) {
    const payload = {
      kind: "instagram_package",
      caption: ctx.snapshot.scriptLab.caption,
      cta: ctx.snapshot.scriptLab.cta,
      checklist: [
        "Confirm final vertical media file.",
        "Review caption and CTA.",
        "Confirm thumbnail/cover frame.",
        "Publish manually or wire a configured integration later.",
      ],
      request: input.request ?? ctx.rawInput,
      publishIntegrationAvailable: false,
    };

    await createMemorySnapshot({
      projectId: ctx.projectId,
      threadId: ctx.threadId,
      summary: "Prepared Instagram publish package.",
      metadata: payload,
    });

    return {
      message: "Instagram package prepared.",
      output: payload,
    };
  },
};

export const runtimeV3Tools: AgentTool<any>[] = [
  generateScriptPackageTool,
  generatePromptJsonTool,
  critiqueScriptTool,
  createScriptVersionTool,
  updateScriptLabTool,
  updateShootPackTool,
  createAssetFolderTool,
  moveAssetTool,
  generateMediaTool,
  createArtifactTool,
  updateActiveGoalTool,
  updateCreativeBriefTool,
  writeEditorTimelineTool,
  publishToInstagramTool,
  prepareEditorHandoffTool,
  prepareInstagramPackageTool,
];

const toolsByName = new Map(runtimeV3Tools.map((tool) => [tool.name, tool]));

export function getRuntimeV3Tool(name: string) {
  return toolsByName.get(name);
}

export function listRuntimeV3Tools() {
  return runtimeV3Tools;
}

export function summarizeRuntimeV3Tools() {
  return runtimeV3Tools.map((tool) => ({
    name: tool.name,
    displayName: tool.displayName,
    description: tool.description,
    sideEffect: tool.sideEffect,
    approvalPolicy: tool.approvalPolicy,
    availability: tool.availability,
  }));
}

export type RuntimeV3ToolName = (typeof runtimeV3Tools)[number]["name"];
