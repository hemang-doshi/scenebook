/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AgentGoalState } from "@/lib/agent/runtime-v3/types";

function mapActiveGoal(row: any): AgentGoalState {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    stage: row.stage,
    completedSteps: row.completed_steps ?? [],
    nextActions: row.next_actions ?? [],
    blockers: row.blockers ?? [],
    metadata: row.metadata ?? {},
  };
}

export async function loadActiveGoal(projectId: string): Promise<AgentGoalState | null> {
  try {
    const supabase = (await createSupabaseServerClient()) as any;
    const { data, error } = await supabase
      .from("agent_goals")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapActiveGoal(data);
  } catch {
    return null;
  }
}

export async function upsertActiveGoal(input: {
  ownerId: string;
  projectId: string;
  threadId: string;
  currentGoalId?: string | null;
  goal: Omit<AgentGoalState, "id" | "metadata"> & { metadata?: Record<string, unknown> };
}): Promise<AgentGoalState> {
  const supabase = (await createSupabaseServerClient()) as any;
  const payload = {
    owner_id: input.ownerId,
    project_id: input.projectId,
    thread_id: input.threadId,
    title: input.goal.title,
    status: input.goal.status,
    stage: input.goal.stage,
    completed_steps: input.goal.completedSteps,
    next_actions: input.goal.nextActions,
    blockers: input.goal.blockers,
    metadata: input.goal.metadata ?? {},
    updated_at: new Date().toISOString(),
  };

  const query = input.currentGoalId
    ? supabase.from("agent_goals").update(payload).eq("id", input.currentGoalId).select("*").single()
    : supabase.from("agent_goals").insert(payload).select("*").single();
  const { data, error } = await query;

  if (error || !data) {
    throw error ?? new Error("Unable to update active goal.");
  }

  return mapActiveGoal(data);
}
