/* eslint-disable @typescript-eslint/no-explicit-any */
import { saveProjectMemory } from "@/lib/agent/runtime-v4/memory/project-mind";
import type {
  ProjectRunSummary,
} from "@/lib/agent/runtime-v4/memory/memory-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ToolObservation } from "@/lib/agent/runtime-v3/types";
import type { JsonValue } from "@/lib/types";

export type RunSummaryOutput = {
  outputType?: string;
  outputId?: string;
  title?: string;
  summary: string;
  content?: Record<string, JsonValue>;
};

export type SaveRunSummaryInput = {
  projectId: string;
  threadId: string;
  runId: string;
  userGoal: string;
  actionsTaken: string[];
  workspaceChanges: Array<Record<string, JsonValue>>;
  selectedOutputs?: RunSummaryOutput[];
  rejectedOutputs?: RunSummaryOutput[];
  openNextSteps: string[];
  summary?: string;
  metadata?: Record<string, JsonValue>;
};

function jsonObject(value: unknown): Record<string, JsonValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return JSON.parse(JSON.stringify(value)) as Record<string, JsonValue>;
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

function compactOutput(output: RunSummaryOutput) {
  return {
    outputType: output.outputType ?? null,
    outputId: output.outputId ?? null,
    title: output.title ?? null,
    summary: output.summary,
    ...(output.content ?? {}),
  } satisfies Record<string, JsonValue>;
}

function defaultSummary(input: SaveRunSummaryInput) {
  if (input.summary?.trim()) {
    return input.summary.trim();
  }

  const actionCount = input.actionsTaken.length;
  const changeCount = input.workspaceChanges.length;
  if (actionCount === 0 && changeCount === 0) {
    return "Agent run completed without a durable workspace change.";
  }

  return [
    actionCount === 1 ? "1 action" : `${actionCount} actions`,
    changeCount === 1 ? "1 workspace change" : `${changeCount} workspace changes`,
  ].join("; ");
}

export async function saveRunSummary(input: SaveRunSummaryInput): Promise<ProjectRunSummary> {
  const supabase = (await createSupabaseServerClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const selectedOutputs = (input.selectedOutputs ?? []).map(compactOutput);
  const rejectedOutputs = (input.rejectedOutputs ?? []).map(compactOutput);
  const payload = {
    owner_id: user.id,
    project_id: input.projectId,
    thread_id: input.threadId,
    run_id: input.runId,
    user_goal: input.userGoal,
    summary: defaultSummary(input),
    actions_taken: input.actionsTaken,
    workspace_changes: input.workspaceChanges,
    selected_outputs: selectedOutputs,
    rejected_outputs: rejectedOutputs,
    open_next_steps: input.openNextSteps,
    metadata: input.metadata ?? {},
  };

  const { data, error } = await supabase
    .from("agent_run_summaries")
    .upsert(payload, { onConflict: "run_id" })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to save agent run summary.");
  }

  const runSummary = mapRunSummary(data);
  await saveProjectMemory({
    projectId: input.projectId,
    threadId: input.threadId,
    runId: input.runId,
    memoryType: "agent_summary",
    summary: runSummary.summary,
    content: {
      runSummaryId: runSummary.id,
      userGoal: input.userGoal,
      actionsTaken: input.actionsTaken,
      openNextSteps: input.openNextSteps,
    },
    source: "system",
    confidence: 1,
  });

  await Promise.all([
    ...selectedOutputs.map((output) => saveProjectMemory({
      projectId: input.projectId,
      threadId: input.threadId,
      runId: input.runId,
      memoryType: "selected_output" as const,
      summary: output.summary,
      content: output,
      source: "agent" as const,
      confidence: 1,
    })),
    ...rejectedOutputs.map((output) => saveProjectMemory({
      projectId: input.projectId,
      threadId: input.threadId,
      runId: input.runId,
      memoryType: "rejected_output" as const,
      summary: output.summary,
      content: output,
      source: "agent" as const,
      confidence: 1,
    })),
  ]);

  return runSummary;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function observationKind(observation: ToolObservation) {
  return stringValue(observation.output?.kind) ?? observation.toolName;
}

function selectedOutputFromObservation(observation: ToolObservation): RunSummaryOutput | null {
  if (observation.status !== "completed") {
    return null;
  }

  const output = observation.output ?? {};
  const kind = observationKind(observation);
  if (kind === "script_version") {
    return {
      outputType: "script_version",
      outputId: stringValue(output.versionId) ?? undefined,
      title: stringValue(output.title) ?? undefined,
      summary: `Selected script version: ${stringValue(output.title) ?? "Untitled script"}.`,
      content: jsonObject(output),
    };
  }

  if (kind === "media_asset") {
    const outputType = stringValue(output.modality) ?? "media_asset";
    const title = stringValue(output.title) ?? `${outputType} asset`;
    return {
      outputType,
      outputId: stringValue(output.assetId) ?? undefined,
      title,
      summary: `Selected ${outputType} output: ${title}.`,
      content: jsonObject(output),
    };
  }

  if (kind === "project_artifact") {
    const title = stringValue(output.title) ?? "Project artifact";
    return {
      outputType: stringValue(output.artifactType) ?? "project_artifact",
      outputId: stringValue(output.artifactId) ?? undefined,
      title,
      summary: `Selected project artifact: ${title}.`,
      content: jsonObject(output),
    };
  }

  return null;
}

function rejectedOutputFromObservation(observation: ToolObservation): RunSummaryOutput | null {
  if (observation.status !== "failed" && observation.status !== "blocked") {
    return null;
  }

  return {
    outputType: observation.toolName,
    outputId: observation.toolCallId,
    title: observation.toolName,
    summary: `${observation.toolName} did not produce a usable output: ${observation.message}`,
    content: jsonObject(observation.output),
  };
}

function workspaceChangeFromObservation(observation: ToolObservation): Record<string, JsonValue> | null {
  if (observation.status !== "completed") {
    return null;
  }

  const kind = observationKind(observation);
  const writeKinds = new Set([
    "script_lab_update",
    "shoot_pack_update",
    "script_version",
    "asset_folder",
    "asset_move",
    "media_asset",
    "project_artifact",
    "active_goal",
    "creative_brief",
    "editor_handoff",
    "instagram_package",
  ]);

  if (!writeKinds.has(kind)) {
    return null;
  }

  return {
    toolName: observation.toolName,
    toolCallId: observation.toolCallId ?? null,
    kind,
    message: observation.message,
    output: jsonObject(observation.output),
  };
}

export function buildRunSummaryFromObservations(input: {
  projectId: string;
  threadId: string;
  runId: string;
  userGoal: string;
  observations: ToolObservation[];
  finalResponse?: string;
}): SaveRunSummaryInput | null {
  const meaningful = input.observations.some((observation) =>
    observation.status === "completed" || observation.status === "failed" || observation.status === "blocked" || observation.status === "awaiting_approval",
  );

  if (!meaningful) {
    return null;
  }

  const actionsTaken = input.observations.map((observation) =>
    `${observation.toolName}: ${observation.message}`,
  );
  const workspaceChanges = input.observations
    .map(workspaceChangeFromObservation)
    .filter((change): change is Record<string, JsonValue> => Boolean(change));
  const selectedOutputs = input.observations
    .map(selectedOutputFromObservation)
    .filter((output): output is RunSummaryOutput => Boolean(output));
  const rejectedOutputs = input.observations
    .map(rejectedOutputFromObservation)
    .filter((output): output is RunSummaryOutput => Boolean(output));
  const openNextSteps = input.observations
    .filter((observation) => observation.status === "awaiting_approval" || observation.status === "blocked" || observation.status === "failed")
    .map((observation) => observation.message);

  return {
    projectId: input.projectId,
    threadId: input.threadId,
    runId: input.runId,
    userGoal: input.userGoal,
    actionsTaken,
    workspaceChanges,
    selectedOutputs,
    rejectedOutputs,
    openNextSteps,
    summary: input.finalResponse,
    metadata: {
      source: "runtime-v4",
      observationCount: input.observations.length,
    },
  };
}
