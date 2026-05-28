/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JsonValue } from "@/lib/types";

export const agentGoalStages = [
  "ideating",
  "briefing",
  "scripting",
  "asset_planning",
  "generating_assets",
  "editing",
  "publishing",
  "analyzing",
  "complete",
] as const;

export type AgentGoalStage = (typeof agentGoalStages)[number];

export interface AgentGoalRecord {
  id: string;
  owner_id: string;
  project_id: string;
  thread_id: string | null;
  title: string;
  status: string;
  completed_steps: JsonValue;
  next_actions: JsonValue;
  metadata: Record<string, JsonValue | undefined>;
  created_at?: string;
  updated_at?: string;
}

type CreateAgentGoalInput = {
  projectId: string;
  threadId?: string | null;
  title: string;
  stage?: AgentGoalStage;
  completedSteps?: string[];
  nextActions?: string[];
  metadata?: Record<string, JsonValue | undefined>;
};

type UpdateAgentGoalInput = {
  goalId: string;
  title?: string;
  status?: string;
  stage?: AgentGoalStage;
  completedSteps?: string[];
  nextActions?: string[];
  metadata?: Record<string, JsonValue | undefined>;
};

type CompleteGoalStepInput = {
  goalId: string;
  step: string;
  stage?: AgentGoalStage;
  nextActions?: string[];
  metadata?: Record<string, JsonValue | undefined>;
};

type AddGoalNextActionsInput = {
  goalId: string;
  nextActions: string[];
  stage?: AgentGoalStage;
  metadata?: Record<string, JsonValue | undefined>;
};

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  return { supabase: supabase as any, user };
}

function asRecord(value: unknown): Record<string, JsonValue | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, JsonValue | undefined>
    : {};
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeStage(stage: unknown): AgentGoalStage {
  return agentGoalStages.includes(stage as AgentGoalStage) ? stage as AgentGoalStage : "ideating";
}

export function getGoalStage(goal: AgentGoalRecord | null | undefined): AgentGoalStage {
  if (!goal) {
    return "ideating";
  }

  if (goal.status === "complete") {
    return "complete";
  }

  return normalizeStage(goal.metadata?.stage);
}

export function getGoalNextActions(goal: AgentGoalRecord | null | undefined): string[] {
  return goal ? stringList(goal.next_actions) : [];
}

export function getGoalCompletedSteps(goal: AgentGoalRecord | null | undefined): string[] {
  return goal ? stringList(goal.completed_steps) : [];
}

export function getGoalNextAction(goal: AgentGoalRecord | null | undefined): string {
  return getGoalNextActions(goal)[0] ?? "Choose the next production step.";
}

export function summarizeAgentGoalForClient(goal: AgentGoalRecord | null) {
  if (!goal) {
    return null;
  }

  const nextActions = getGoalNextActions(goal);

  return {
    id: goal.id,
    title: goal.title,
    status: goal.status,
    stage: getGoalStage(goal),
    nextActions,
    nextSuggestedAction: nextActions[0] ?? null,
    completedStepCount: getGoalCompletedSteps(goal).length,
  };
}

export function formatGoalFinalResponse(input: {
  goal: AgentGoalRecord;
  whatChanged: string;
  nextAction?: string;
}) {
  const stage = getGoalStage(input.goal).replaceAll("_", " ");
  const nextAction = input.nextAction ?? getGoalNextAction(input.goal);

  return [
    `Current goal: ${input.goal.title}`,
    `Current stage: ${stage}`,
    `What changed: ${input.whatChanged}`,
    `Next suggested action: ${nextAction}`,
  ].join("\n");
}

function isMissingGoalTableError(error: unknown) {
  const message = error instanceof Error
    ? error.message.toLowerCase()
    : typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

  return (
    !message ||
    message.includes("agent_goals") ||
    message.includes("relation") ||
    message.includes("schema cache") ||
    message.includes("select is not a function") ||
    message.includes("insert is not a function") ||
    message.includes("update is not a function")
  );
}

function normalizeGoalRow(row: any): AgentGoalRecord {
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    project_id: String(row.project_id),
    thread_id: row.thread_id ? String(row.thread_id) : null,
    title: String(row.title ?? "Active creative goal"),
    status: String(row.status ?? "active"),
    completed_steps: row.completed_steps ?? [],
    next_actions: row.next_actions ?? [],
    metadata: asRecord(row.metadata),
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

function normalizeFallbackSnapshot(row: any): AgentGoalRecord {
  const metadata = asRecord(row.metadata);
  const completedSteps = stringList(metadata.completed_steps);
  const nextActions = stringList(metadata.next_actions);

  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    project_id: String(row.project_id),
    thread_id: row.thread_id ? String(row.thread_id) : null,
    title: typeof metadata.title === "string" ? metadata.title : String(row.summary ?? "Active creative goal"),
    status: typeof metadata.status === "string" ? metadata.status : "active",
    completed_steps: completedSteps,
    next_actions: nextActions,
    metadata,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.created_at === "string" ? row.created_at : undefined,
  };
}

async function getGoalById(goalId: string) {
  const { supabase, user } = await requireUser();

  try {
    const { data, error } = await supabase
      .from("agent_goals")
      .select("*")
      .eq("id", goalId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? normalizeGoalRow(data) : null;
  } catch (error) {
    if (!isMissingGoalTableError(error)) {
      throw error;
    }

    return getFallbackGoalById(goalId);
  }
}

async function getFallbackGoalById(goalId: string) {
  try {
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
      .from("agent_memory_snapshots")
      .select("*")
      .eq("id", goalId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? normalizeFallbackSnapshot(data) : null;
  } catch {
    return null;
  }
}

export async function createAgentGoal(input: CreateAgentGoalInput): Promise<AgentGoalRecord> {
  const { supabase, user } = await requireUser();
  const stage = input.stage ?? "ideating";
  const metadata = {
    ...(input.metadata ?? {}),
    stage,
  };

  try {
    const { data, error } = await supabase
      .from("agent_goals")
      .insert({
        owner_id: user.id,
        project_id: input.projectId,
        thread_id: input.threadId ?? null,
        title: input.title,
        status: stage === "complete" ? "complete" : "active",
        completed_steps: input.completedSteps ?? [],
        next_actions: input.nextActions ?? [],
        metadata,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("Unable to create agent goal.");
    }

    return normalizeGoalRow(data);
  } catch (error) {
    if (!isMissingGoalTableError(error)) {
      throw error;
    }

    return createFallbackGoal(input, user.id);
  }
}

async function createFallbackGoal(input: CreateAgentGoalInput, ownerId: string): Promise<AgentGoalRecord> {
  if (!input.threadId) {
    throw new Error("A thread id is required for agent goal memory fallback.");
  }

  const { supabase } = await requireUser();
  const stage = input.stage ?? "ideating";
  const metadata = {
    ...(input.metadata ?? {}),
    kind: "agent_goal",
    title: input.title,
    status: stage === "complete" ? "complete" : "active",
    stage,
    completed_steps: input.completedSteps ?? [],
    next_actions: input.nextActions ?? [],
  };
  const { data, error } = await supabase
    .from("agent_memory_snapshots")
    .insert({
      owner_id: ownerId,
      thread_id: input.threadId,
      project_id: input.projectId,
      summary: input.title,
      decisions: input.completedSteps ?? [],
      open_questions: input.nextActions ?? [],
      metadata,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create fallback agent goal.");
  }

  return normalizeFallbackSnapshot(data);
}

export async function getActiveAgentGoal(
  projectId: string,
  threadId?: string | null,
): Promise<AgentGoalRecord | null> {
  const { supabase, user } = await requireUser();

  try {
    const { data, error } = await supabase
      .from("agent_goals")
      .select("*")
      .eq("owner_id", user.id)
      .eq("project_id", projectId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(5);

    if (error) {
      throw error;
    }

    const goals = ((data ?? []) as any[]).map(normalizeGoalRow);
    return preferThreadGoal(goals, threadId);
  } catch (error) {
    if (!isMissingGoalTableError(error)) {
      throw error;
    }

    return getActiveFallbackGoal(projectId, threadId);
  }
}

async function getActiveFallbackGoal(projectId: string, threadId?: string | null) {
  try {
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
      .from("agent_memory_snapshots")
      .select("*")
      .eq("owner_id", user.id)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    const goals = ((data ?? []) as any[])
      .filter((row) => {
        const metadata = asRecord(row.metadata);
        return metadata.kind === "agent_goal" && metadata.status !== "complete";
      })
      .map(normalizeFallbackSnapshot);

    return preferThreadGoal(goals, threadId);
  } catch {
    return null;
  }
}

function preferThreadGoal(goals: AgentGoalRecord[], threadId?: string | null) {
  if (goals.length === 0) {
    return null;
  }

  if (threadId) {
    return goals.find((goal) => goal.thread_id === threadId)
      ?? goals.find((goal) => goal.thread_id === null)
      ?? goals[0];
  }

  return goals[0];
}

export async function updateAgentGoal(input: UpdateAgentGoalInput): Promise<AgentGoalRecord> {
  const existing = await getGoalById(input.goalId);
  if (!existing) {
    throw new Error("Agent goal not found.");
  }

  const { supabase, user } = await requireUser();
  const metadata = {
    ...existing.metadata,
    ...(input.metadata ?? {}),
    ...(input.stage ? { stage: input.stage } : {}),
  };
  const status = input.status ?? (input.stage === "complete" ? "complete" : existing.status);

  try {
    const { data, error } = await supabase
      .from("agent_goals")
      .update({
        ...(input.title ? { title: input.title } : {}),
        status,
        ...(input.completedSteps ? { completed_steps: input.completedSteps } : {}),
        ...(input.nextActions ? { next_actions: input.nextActions } : {}),
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.goalId)
      .eq("owner_id", user.id)
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("Unable to update agent goal.");
    }

    return normalizeGoalRow(data);
  } catch (error) {
    if (!isMissingGoalTableError(error)) {
      throw error;
    }

    return updateFallbackGoal(existing, {
      ...input,
      status,
      metadata,
    });
  }
}

async function updateFallbackGoal(
  existing: AgentGoalRecord,
  input: UpdateAgentGoalInput,
): Promise<AgentGoalRecord> {
  const { supabase, user } = await requireUser();
  const metadata = {
    ...existing.metadata,
    ...(input.metadata ?? {}),
    kind: "agent_goal",
    title: input.title ?? existing.title,
    status: input.status ?? existing.status,
    completed_steps: input.completedSteps ?? getGoalCompletedSteps(existing),
    next_actions: input.nextActions ?? getGoalNextActions(existing),
    ...(input.stage ? { stage: input.stage } : {}),
  };

  const { data, error } = await supabase
    .from("agent_memory_snapshots")
    .update({
      summary: input.title ?? existing.title,
      decisions: input.completedSteps ?? getGoalCompletedSteps(existing),
      open_questions: input.nextActions ?? getGoalNextActions(existing),
      metadata,
    })
    .eq("id", input.goalId)
    .eq("owner_id", user.id)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to update fallback agent goal.");
  }

  return normalizeFallbackSnapshot(data);
}

export async function completeGoalStep(input: CompleteGoalStepInput): Promise<AgentGoalRecord> {
  const existing = await getGoalById(input.goalId);
  if (!existing) {
    throw new Error("Agent goal not found.");
  }

  const completedSteps = uniqueStrings([...getGoalCompletedSteps(existing), input.step]);
  const nextActions = input.nextActions
    ? uniqueStrings(input.nextActions)
    : getGoalNextActions(existing);

  return updateAgentGoal({
    goalId: input.goalId,
    stage: input.stage,
    completedSteps,
    nextActions,
    metadata: input.metadata,
  });
}

export async function addGoalNextActions(input: AddGoalNextActionsInput): Promise<AgentGoalRecord> {
  const existing = await getGoalById(input.goalId);
  if (!existing) {
    throw new Error("Agent goal not found.");
  }

  const nextActions = uniqueStrings([...getGoalNextActions(existing), ...input.nextActions]);

  return updateAgentGoal({
    goalId: input.goalId,
    stage: input.stage,
    nextActions,
    metadata: input.metadata,
  });
}
