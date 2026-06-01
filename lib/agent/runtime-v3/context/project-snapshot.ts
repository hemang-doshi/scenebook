/* eslint-disable @typescript-eslint/no-explicit-any */
import { getProjectAssetLibrary } from "@/lib/assets/asset-folders";
import { getAgentHistory } from "@/lib/agent/runtime";
import { getLatestProjectMemory } from "@/lib/agent/memory";
import { loadCreativeBrief } from "@/lib/agent/runtime-v3/memory/creative-brief-store";
import { loadActiveGoal } from "@/lib/agent/runtime-v3/memory/goal-store";
import { getProjectWorkspace } from "@/lib/data/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AgentGoalStage,
  CreativeBriefState,
  ProjectReadiness,
  ProjectSnapshot,
  ScriptVersionSummary,
} from "@/lib/agent/runtime-v3/types";
import type { ChecklistItem, JsonValue, ScriptLab, ShootPack } from "@/lib/types";

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

async function maybeLoadMemories(projectId: string) {
  const latest = await getLatestProjectMemory(projectId).catch(() => null);
  if (!latest) {
    return [];
  }
  return [
    {
      summary: latest.summary as string,
      createdAt: latest.created_at as string | undefined,
      metadata: latest.metadata as Record<string, JsonValue> | undefined,
    },
  ];
}

export async function buildProjectSnapshot(input: {
  projectId: string;
  threadId?: string;
}): Promise<ProjectSnapshot> {
  const project = await getProjectWorkspace(input.projectId);

  if (!project) {
    throw new Error("Project not found.");
  }

  const [history, library, creativeBrief, activeGoal, scriptVersions, memory] = await Promise.all([
    input.threadId
      ? getAgentHistory(input.projectId, input.threadId).catch(() => ({ messages: [], toolCalls: [], thread: null }))
      : Promise.resolve({ messages: [], toolCalls: [], thread: null }),
    getProjectAssetLibrary(input.projectId).catch(() => ({ folders: [], looseAssets: project.assets })),
    loadCreativeBrief(input.projectId),
    loadActiveGoal(input.projectId),
    maybeLoadScriptVersions(input.projectId),
    maybeLoadMemories(input.projectId),
  ]);

  const folderAssets = library.folders.flatMap((folder) => folder.assets);
  const allAssets = [...folderAssets, ...library.looseAssets];
  const readiness = deriveReadiness({
    brief: creativeBrief,
    scriptLab: project.scriptLab,
    shootPack: project.shootPack,
    assetCount: allAssets.length,
    status: project.status,
    publishCaption: project.analyticsJournal.permalink ?? project.scriptLab.caption,
  });

  return {
    project: {
      id: project.id,
      title: project.title,
      platform: project.platform,
      format: project.format,
      status: project.status,
    },
    creativeBrief,
    activeGoal,
    scriptLab: project.scriptLab,
    scriptVersions,
    shootPack: project.shootPack,
    assets: {
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
    },
    editor: {
      ready: project.status === "editing",
      integrationAvailable: false,
      note: "Editor handoff artifacts are available; timeline writes are not wired yet.",
    },
    publish: {
      ready: Boolean(project.scriptLab.caption || project.analyticsJournal.permalink),
      integrationAvailable: false,
      caption: project.scriptLab.caption || null,
    },
    analytics: project.analyticsJournal as unknown as Record<string, JsonValue>,
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
    memory,
    readiness,
  };
}

export function compactSnapshotForModel(snapshot: ProjectSnapshot) {
  return {
    project: snapshot.project,
    brief: snapshot.creativeBrief
      ? {
          audience: snapshot.creativeBrief.audience ?? null,
          tone: snapshot.creativeBrief.tone ?? null,
          coreAngle: snapshot.creativeBrief.coreAngle ?? null,
          openQuestions: snapshot.creativeBrief.openQuestions ?? [],
        }
      : null,
    script: {
      hook: snapshot.scriptLab.hook || null,
      hasScript: filled(snapshot.scriptLab.script),
      hasCaption: filled(snapshot.scriptLab.caption),
      hasCta: filled(snapshot.scriptLab.cta),
    },
    assets: snapshot.assets,
    activeGoal: snapshot.activeGoal,
    readiness: snapshot.readiness,
    recentMessages: snapshot.conversation.recentMessages.slice(-4),
    recentTools: snapshot.toolHistory.slice(-4),
    memory: snapshot.memory.slice(0, 2),
  };
}
