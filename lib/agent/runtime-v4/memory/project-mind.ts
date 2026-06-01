/* eslint-disable @typescript-eslint/no-explicit-any */
import { getProjectAssetLibrary as getDefaultProjectAssetLibrary } from "@/lib/assets/asset-folders";
import { getAgentHistory as getDefaultAgentHistory } from "@/lib/agent/runtime";
import { loadCreativeBrief as loadDefaultCreativeBrief } from "@/lib/agent/runtime-v3/memory/creative-brief-store";
import { loadActiveGoal as loadDefaultActiveGoal } from "@/lib/agent/runtime-v3/memory/goal-store";
import { getProjectWorkspace as getDefaultProjectWorkspace } from "@/lib/data/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AgentGoalStage,
  CreativeBriefState,
  ProjectReadiness,
  ScriptVersionSummary,
} from "@/lib/agent/runtime-v3/types";
import type {
  CompactProjectMind,
  ProjectMemoryRecord,
  ProjectMemoryStatus,
  ProjectMemoryType,
  ProjectMemoryWriteInput,
  ProjectMindSnapshot,
  ProjectMindStores,
  ProjectOutputMemory,
  ProjectRunSummary,
} from "@/lib/agent/runtime-v4/memory/memory-types";
import { projectMemoryTypes } from "@/lib/agent/runtime-v4/memory/memory-types";
import type { ChecklistItem, JsonValue, ScriptLab, ShootPack } from "@/lib/types";

const activeMemoryTypes = new Set<ProjectMemoryType>(projectMemoryTypes);

function filled(value: unknown) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function percent(done: number, total: number) {
  if (total === 0) {
    return 0;
  }
  return Math.round((done / total) * 100);
}

function checklistCompleteness(items: ChecklistItem[]) {
  if (items.length === 0) {
    return 0;
  }
  return percent(items.filter((item) => item.done).length, items.length);
}

function deriveScriptCompleteness(scriptLab: ScriptLab) {
  const fields = [
    scriptLab.angle,
    scriptLab.hook,
    scriptLab.outline,
    scriptLab.script,
    scriptLab.caption,
    scriptLab.onScreenText,
    scriptLab.cta,
  ];
  return percent(fields.filter(filled).length, fields.length);
}

function deriveBriefCompleteness(brief: CreativeBriefState | null) {
  if (!brief) {
    return 0;
  }

  const fields = [
    brief.audience,
    brief.platform,
    brief.format,
    brief.tone,
    brief.coreAngle,
    brief.viewerPromise,
    brief.visualStyle,
    brief.cta,
  ];
  return percent(fields.filter(filled).length, fields.length);
}

function deriveShootReadiness(shootPack: ShootPack) {
  const items = [
    ...shootPack.aRoll,
    ...shootPack.bRoll,
    ...shootPack.screenCaptures,
    ...shootPack.props,
    ...shootPack.missingAssets,
  ];

  if (items.length > 0) {
    return checklistCompleteness(items);
  }

  return percent(
    [shootPack.locationNotes, shootPack.visualNotes].filter(filled).length,
    2,
  );
}

function deriveNextStage(input: {
  brief: number;
  script: number;
  assets: number;
  shoot: number;
  status: string;
}): AgentGoalStage {
  if (input.status === "posted") return "analyzing";
  if (input.status === "editing") return "editing";
  if (input.status === "ready_to_shoot" || input.status === "shot") return "generating_assets";
  if (input.brief < 70) return "briefing";
  if (input.script < 70) return "scripting";
  if (input.assets < 50) return "asset_planning";
  if (input.shoot < 70) return "asset_planning";
  return "publishing";
}

function deriveReadiness(input: {
  brief: CreativeBriefState | null;
  scriptLab: ScriptLab;
  shootPack: ShootPack;
  assetCount: number;
  status: string;
  publishCaption?: string | null;
}): ProjectReadiness {
  const briefCompleteness = deriveBriefCompleteness(input.brief);
  const scriptCompleteness = deriveScriptCompleteness(input.scriptLab);
  const shootReadiness = deriveShootReadiness(input.shootPack);
  const assetReadiness = input.assetCount > 0 ? Math.min(100, 25 + input.assetCount * 25) : 0;
  const editorReadiness = input.status === "editing" || input.status === "posted" ? 80 : 0;
  const publishReadiness = input.publishCaption || input.status === "posted" ? 80 : 0;
  const missing: string[] = [];

  if (briefCompleteness < 70) missing.push("creative brief");
  if (scriptCompleteness < 70) missing.push("script");
  if (assetReadiness < 50) missing.push("assets");
  if (shootReadiness < 70) missing.push("shoot pack");
  if (publishReadiness < 50) missing.push("publish package");

  return {
    briefCompleteness,
    scriptCompleteness,
    assetReadiness,
    shootReadiness,
    editorReadiness,
    publishReadiness,
    nextLikelyStage: deriveNextStage({
      brief: briefCompleteness,
      script: scriptCompleteness,
      assets: assetReadiness,
      shoot: shootReadiness,
      status: input.status,
    }),
    missing,
  };
}

function jsonObject(value: unknown): Record<string, JsonValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return JSON.parse(JSON.stringify(value)) as Record<string, JsonValue>;
}

function clampConfidence(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 1;
  }
  return Math.max(0, Math.min(1, value));
}

function mapProjectMemory(row: any): ProjectMemoryRecord {
  const memoryType = activeMemoryTypes.has(row.memory_type) ? row.memory_type : "workflow_checkpoint";
  return {
    id: row.id,
    projectId: row.project_id,
    ownerId: row.owner_id,
    threadId: row.thread_id ?? null,
    runId: row.run_id ?? null,
    toolCallId: row.tool_call_id ?? null,
    memoryType,
    summary: row.summary,
    content: jsonObject(row.content),
    source: row.source ?? "system",
    confidence: clampConfidence(row.confidence),
    userApproved: Boolean(row.user_approved),
    supersedesMemoryId: row.supersedes_memory_id ?? null,
    status: (row.status ?? "active") as ProjectMemoryStatus,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

function mapOutputMemory(memory: ProjectMemoryRecord): ProjectOutputMemory {
  return {
    ...memory,
    memoryType: memory.memoryType as "selected_output" | "rejected_output",
    outputType: typeof memory.content.outputType === "string" ? memory.content.outputType : null,
    outputId: typeof memory.content.outputId === "string" ? memory.content.outputId : null,
    title: typeof memory.content.title === "string" ? memory.content.title : null,
  };
}

function mapRunSummary(row: any): ProjectRunSummary {
  return {
    id: row.id,
    ownerId: row.owner_id,
    projectId: row.project_id,
    threadId: row.thread_id,
    runId: row.run_id,
    userGoal: row.user_goal,
    summary: row.summary,
    actionsTaken: Array.isArray(row.actions_taken) ? row.actions_taken.filter((item: unknown): item is string => typeof item === "string") : [],
    workspaceChanges: Array.isArray(row.workspace_changes) ? row.workspace_changes.map(jsonObject) : [],
    selectedOutputs: Array.isArray(row.selected_outputs) ? row.selected_outputs.map(jsonObject) : [],
    rejectedOutputs: Array.isArray(row.rejected_outputs) ? row.rejected_outputs.map(jsonObject) : [],
    openNextSteps: Array.isArray(row.open_next_steps) ? row.open_next_steps.filter((item: unknown): item is string => typeof item === "string") : [],
    metadata: jsonObject(row.metadata),
    createdAt: row.created_at ?? undefined,
  };
}

async function maybeLoadScriptVersions(projectId: string): Promise<ScriptVersionSummary[]> {
  try {
    const supabase = (await createSupabaseServerClient()) as any;
    const { data, error } = await supabase
      .from("script_versions")
      .select("id,title,active,created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return [];
    }

    return ((data ?? []) as any[]).map((row) => ({
      id: row.id,
      title: row.title,
      active: Boolean(row.active),
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function listProjectMemories(projectId: string, limit = 50): Promise<ProjectMemoryRecord[]> {
  const supabase = (await createSupabaseServerClient()) as any;
  const { data, error } = await supabase
    .from("project_memory_entries")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as any[]).map(mapProjectMemory);
}

export async function saveProjectMemory(input: ProjectMemoryWriteInput): Promise<ProjectMemoryRecord> {
  const supabase = (await createSupabaseServerClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { data, error } = await supabase
    .from("project_memory_entries")
    .insert({
      owner_id: user.id,
      project_id: input.projectId,
      thread_id: input.threadId ?? null,
      run_id: input.runId ?? null,
      tool_call_id: input.toolCallId ?? null,
      memory_type: input.memoryType,
      summary: input.summary,
      content: input.content ?? {},
      source: input.source ?? "agent",
      confidence: input.confidence ?? 1,
      user_approved: input.userApproved ?? false,
      supersedes_memory_id: input.supersedesMemoryId ?? null,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to save project memory.");
  }

  return mapProjectMemory(data);
}

export async function listProjectRunSummaries(projectId: string, limit = 10): Promise<ProjectRunSummary[]> {
  const supabase = (await createSupabaseServerClient()) as any;
  const { data, error } = await supabase
    .from("agent_run_summaries")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as any[]).map(mapRunSummary);
}

function compactMemoryForLegacy(memory: ProjectMemoryRecord) {
  return {
    summary: memory.summary,
    createdAt: memory.createdAt,
    metadata: {
      id: memory.id,
      memoryType: memory.memoryType,
      confidence: memory.confidence,
      userApproved: memory.userApproved,
      ...memory.content,
    },
  };
}

function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch(() => fallback);
}

export async function buildProjectMind(input: {
  projectId: string;
  threadId?: string;
  stores?: ProjectMindStores;
}): Promise<ProjectMindSnapshot> {
  const stores = input.stores ?? {};
  const getProjectWorkspace = stores.getProjectWorkspace ?? getDefaultProjectWorkspace;
  const project = await getProjectWorkspace(input.projectId);

  if (!project) {
    throw new Error("Project not found.");
  }

  const getAgentHistory = stores.getAgentHistory ?? getDefaultAgentHistory;
  const getProjectAssetLibrary = stores.getProjectAssetLibrary ?? getDefaultProjectAssetLibrary;
  const loadCreativeBrief = stores.loadCreativeBrief ?? loadDefaultCreativeBrief;
  const loadActiveGoal = stores.loadActiveGoal ?? loadDefaultActiveGoal;
  const listScriptVersions = stores.listScriptVersions ?? maybeLoadScriptVersions;
  const loadMemories = stores.listProjectMemories ?? listProjectMemories;
  const loadRunSummaries = stores.listRecentRunSummaries ?? listProjectRunSummaries;

  const [history, library, creativeBrief, activeGoal, scriptVersions, projectMemories, recentRunSummaries] =
    await Promise.all([
      input.threadId
        ? safe(getAgentHistory(input.projectId, input.threadId), { messages: [], toolCalls: [], thread: null })
        : Promise.resolve({ messages: [], toolCalls: [], thread: null }),
      safe(getProjectAssetLibrary(input.projectId), { folders: [], looseAssets: project.assets }),
      safe(loadCreativeBrief(input.projectId), null),
      safe(loadActiveGoal(input.projectId), null),
      safe(listScriptVersions(input.projectId), []),
      safe(loadMemories(input.projectId, 50), []),
      safe(loadRunSummaries(input.projectId, 10), []),
    ]);

  const folderAssets = library.folders.flatMap((folder) => folder.assets);
  const allAssets = [...folderAssets, ...library.looseAssets];
  const assetLibrary = {
    count: allAssets.length,
    folders: library.folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      assetCount: folder.assets.length,
    })),
    looseAssetCount: library.looseAssets.length,
    recent: allAssets.slice(-5).map((asset) => ({
      id: asset.id,
      title: asset.title,
      type: asset.type,
      url: asset.url,
    })),
  };
  const analyticsPermalink = project.analyticsJournal?.permalink;
  const publishCaption = typeof analyticsPermalink === "string" ? analyticsPermalink : project.scriptLab.caption;
  const readiness = deriveReadiness({
    brief: creativeBrief,
    scriptLab: project.scriptLab,
    shootPack: project.shootPack,
    assetCount: allAssets.length,
    status: project.status,
    publishCaption,
  });
  const selectedOutputs = projectMemories
    .filter((memory) => memory.memoryType === "selected_output")
    .map(mapOutputMemory);
  const rejectedOutputs = projectMemories
    .filter((memory) => memory.memoryType === "rejected_output")
    .map(mapOutputMemory);
  const durableProjectMemories = projectMemories.filter(
    (memory) => memory.memoryType !== "selected_output" && memory.memoryType !== "rejected_output" && memory.memoryType !== "agent_summary",
  );

  return {
    project: {
      id: project.id,
      ownerId: project.ownerId,
      title: project.title,
      platform: project.platform,
      format: project.format,
      status: project.status,
      topicTags: project.topicTags,
      experimentTags: project.experimentTags,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    creativeBrief,
    activeGoal,
    scriptLab: project.scriptLab,
    scriptVersions,
    shootPack: project.shootPack,
    assets: assetLibrary,
    assetLibrary,
    selectedOutputs,
    rejectedOutputs,
    durableProjectMemories,
    recentRunSummaries,
    integrationState: {
      available: false,
      connections: [],
      note: "External integrations are not wired in Agent v4 yet.",
    },
    editor: {
      ready: project.status === "editing",
      integrationAvailable: false,
      note: "Editor handoff artifacts are available; timeline writes are not wired yet.",
    },
    publish: {
      ready: Boolean(project.scriptLab.caption || project.analyticsJournal?.permalink),
      integrationAvailable: false,
      caption: project.scriptLab.caption || null,
    },
    analytics: project.analyticsJournal as Record<string, JsonValue> | null,
    conversation: {
      recentMessages: history.messages.slice(-8).map((message) => ({
        role: message.role,
        content: message.content.slice(0, 500),
        createdAt: message.created_at,
      })),
    },
    toolHistory: history.toolCalls.slice(-8).map((toolCall) => ({
      id: toolCall.id,
      toolName: toolCall.tool_name,
      status: toolCall.status,
      command: toolCall.command,
      createdAt: toolCall.created_at,
    })),
    memory: durableProjectMemories.slice(0, 8).map(compactMemoryForLegacy),
    readiness,
  };
}

function outputPick(memory: ProjectOutputMemory) {
  return {
    id: memory.id,
    summary: memory.summary,
    outputType: memory.outputType ?? null,
    outputId: memory.outputId ?? null,
    title: memory.title ?? null,
    createdAt: memory.createdAt,
  };
}

export function compactProjectMindForModel(snapshot: ProjectMindSnapshot): CompactProjectMind {
  return {
    project: snapshot.project,
    creativeBrief: snapshot.creativeBrief
      ? {
          audience: snapshot.creativeBrief.audience,
          platform: snapshot.creativeBrief.platform,
          format: snapshot.creativeBrief.format,
          tone: snapshot.creativeBrief.tone,
          coreAngle: snapshot.creativeBrief.coreAngle,
          viewerPromise: snapshot.creativeBrief.viewerPromise,
          visualStyle: snapshot.creativeBrief.visualStyle,
          cta: snapshot.creativeBrief.cta,
          openQuestions: snapshot.creativeBrief.openQuestions ?? [],
        }
      : null,
    activeGoal: snapshot.activeGoal,
    script: {
      hook: snapshot.scriptLab.hook || null,
      hasScript: filled(snapshot.scriptLab.script),
      hasCaption: filled(snapshot.scriptLab.caption),
      hasCta: filled(snapshot.scriptLab.cta),
      recentVersions: snapshot.scriptVersions.slice(0, 5),
    },
    shootPack: {
      aRoll: snapshot.shootPack.aRoll.length,
      bRoll: snapshot.shootPack.bRoll.length,
      screenCaptures: snapshot.shootPack.screenCaptures.length,
      props: snapshot.shootPack.props.length,
      missingAssets: snapshot.shootPack.missingAssets.length,
    },
    assetLibrary: snapshot.assetLibrary,
    selectedOutputs: snapshot.selectedOutputs.slice(0, 6).map(outputPick),
    rejectedOutputs: snapshot.rejectedOutputs.slice(0, 6).map(outputPick),
    durableMemories: snapshot.durableProjectMemories.slice(0, 8).map((memory) => ({
      id: memory.id,
      memoryType: memory.memoryType,
      summary: memory.summary,
      confidence: memory.confidence,
      userApproved: memory.userApproved,
      createdAt: memory.createdAt,
    })),
    recentRunSummaries: snapshot.recentRunSummaries.slice(0, 5).map((summary) => ({
      id: summary.id,
      userGoal: summary.userGoal,
      summary: summary.summary,
      actionsTaken: summary.actionsTaken.slice(0, 6),
      openNextSteps: summary.openNextSteps.slice(0, 5),
      createdAt: summary.createdAt,
    })),
    integrationState: snapshot.integrationState,
    readiness: snapshot.readiness,
  };
}
