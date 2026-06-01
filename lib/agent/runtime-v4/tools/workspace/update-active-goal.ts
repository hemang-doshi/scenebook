import { z } from "zod";

import { loadActiveGoal, upsertActiveGoal } from "@/lib/agent/runtime-v3/memory/goal-store";
import type { AgentGoalStage, AgentGoalState } from "@/lib/agent/runtime-v3/types";
import type { AgentTool } from "@/lib/agent/runtime-v4/tools/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JsonValue } from "@/lib/types";

type JsonObject = Record<string, JsonValue>;
type GoalStatus = AgentGoalState["status"];
type GoalRow = {
  id?: unknown;
  title?: unknown;
  status?: unknown;
  stage?: unknown;
  completed_steps?: unknown;
  next_actions?: unknown;
  blockers?: unknown;
  metadata?: unknown;
};
type AgentGoalQuery = {
  select(columns: string): AgentGoalQuery;
  eq(column: "project_id" | "id" | "status", value: string): AgentGoalQuery;
  maybeSingle(): Promise<{ data: GoalRow | null; error: Error | null }>;
};
type AgentGoalClient = {
  from(table: "agent_goals"): AgentGoalQuery;
};

const jsonObjectSchema = z.record(z.string(), z.unknown()) as z.ZodType<JsonObject>;

const goalStages = [
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

const goalTaskInput = z.object({
  title: z.string().trim().min(1),
  status: z.enum(["todo", "doing", "done", "blocked"]).default("todo"),
});

const activeGoalInput = z.object({
  title: z.string().trim().min(1).optional(),
  status: z.enum(["active", "paused", "complete", "blocked"]).default("active"),
  stage: z.enum(goalStages).optional(),
  nextAction: z.string().trim().min(1).optional(),
  nextActions: z.array(z.string().trim().min(1)).optional(),
  doneCriteria: z.array(z.string().trim().min(1)).optional(),
  completedSteps: z.array(z.string().trim().min(1)).optional(),
  blockers: z.array(z.string().trim().min(1)).optional(),
  tasks: z.array(goalTaskInput).optional(),
});

type UpdateActiveGoalInput = z.infer<typeof activeGoalInput>;

function checkedAt() {
  return new Date().toISOString();
}

function requireThreadId(threadId: string | undefined) {
  if (!threadId) {
    throw new Error("A thread id is required to update the active goal.");
  }

  return threadId;
}

function toJsonObject(value: unknown): JsonObject {
  return JSON.parse(JSON.stringify(value ?? {})) as JsonObject;
}

function matches(expected: unknown, actual: unknown) {
  return JSON.stringify(expected) === JSON.stringify(actual);
}

function nextActionsFor(input: UpdateActiveGoalInput, existing: AgentGoalState | null) {
  if (input.nextActions) {
    return input.nextActions;
  }
  if (input.nextAction) {
    return [input.nextAction];
  }
  return existing?.nextActions ?? [];
}

function completedStepsFor(input: UpdateActiveGoalInput, existing: AgentGoalState | null) {
  return input.doneCriteria ?? input.completedSteps ?? existing?.completedSteps ?? [];
}

function hasNextActionsInput(input: UpdateActiveGoalInput) {
  return input.nextActions !== undefined || input.nextAction !== undefined;
}

function hasCompletedStepsInput(input: UpdateActiveGoalInput) {
  return input.doneCriteria !== undefined || input.completedSteps !== undefined;
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapGoalRow(row: GoalRow): AgentGoalState {
  return {
    id: typeof row.id === "string" ? row.id : undefined,
    title: typeof row.title === "string" ? row.title : "",
    status: row.status as GoalStatus,
    stage: row.stage as AgentGoalStage,
    completedSteps: stringList(row.completed_steps),
    nextActions: stringList(row.next_actions),
    blockers: stringList(row.blockers),
    metadata: row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? toJsonObject(row.metadata)
      : {},
  };
}

async function loadGoalByIdAndStatus(input: {
  projectId: string;
  goalId: string;
  status: GoalStatus;
}) {
  const supabase = (await createSupabaseServerClient()) as unknown as AgentGoalClient;
  const { data, error } = await supabase
    .from("agent_goals")
    .select("*")
    .eq("project_id", input.projectId)
    .eq("id", input.goalId)
    .eq("status", input.status)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapGoalRow(data as GoalRow);
}

async function loadGoalForVerification(input: {
  projectId: string;
  goalId: unknown;
  status: GoalStatus;
}) {
  if (input.status === "active") {
    return loadActiveGoal(input.projectId);
  }

  return typeof input.goalId === "string"
    ? loadGoalByIdAndStatus({
        projectId: input.projectId,
        goalId: input.goalId,
        status: input.status,
      })
    : null;
}

export const updateActiveGoalTool: AgentTool<UpdateActiveGoalInput, JsonObject> = {
  name: "update_active_goal",
  displayName: "Update Active Goal",
  description: "Creates or updates the active project goal.",
  inputSchema: activeGoalInput,
  outputSchema: jsonObjectSchema,
  riskLevel: "low",
  sideEffect: "workspace",
  approvalPolicy: "never",
  availability: "available",
  async handler(input, context) {
    const existing = await loadActiveGoal(context.projectId);
    const threadId = requireThreadId(context.threadId);
    const title = input.title ?? existing?.title;
    const stage = input.stage ?? existing?.stage ?? "ideating";
    const status = input.status ?? "active";

    if (!title) {
      throw new Error("A title is required when creating an active goal.");
    }

    const nextActions = nextActionsFor(input, existing);
    const completedSteps = completedStepsFor(input, existing);
    const metadata = {
      ...(existing?.metadata ?? {}),
      ...(input.tasks ? { tasks: input.tasks } : {}),
    };
    const goal = await upsertActiveGoal({
      ownerId: context.userId,
      projectId: context.projectId,
      threadId,
      currentGoalId: existing?.id ?? null,
      goal: {
        title,
        status,
        stage: stage as AgentGoalStage,
        completedSteps,
        nextActions,
        blockers: input.blockers ?? existing?.blockers ?? [],
        metadata,
      },
    });

    return {
      kind: "active_goal",
      goalId: goal.id ?? null,
      title: goal.title,
      status: goal.status,
      stage: goal.stage,
      nextActions: goal.nextActions,
      completedSteps: goal.completedSteps,
      tasks: toJsonObject(goal.metadata ?? {}).tasks ?? null,
    };
  },
  async verify(input, output, context) {
    const status = input.status ?? "active";
    const actual = await loadGoalForVerification({
      projectId: context.projectId,
      goalId: output.goalId,
      status,
    });
    const checks: boolean[] = [];

    if (input.title !== undefined) checks.push(actual?.title === input.title);
    checks.push(actual?.status === status);
    if (input.stage !== undefined) checks.push(actual?.stage === input.stage);
    if (hasNextActionsInput(input)) checks.push(matches(actual?.nextActions, nextActionsFor(input, null)));
    if (hasCompletedStepsInput(input)) checks.push(matches(actual?.completedSteps, completedStepsFor(input, null)));
    if (input.blockers !== undefined) checks.push(matches(actual?.blockers, input.blockers));
    if (input.tasks !== undefined) checks.push(matches(actual?.metadata?.tasks, input.tasks));

    const verified = Boolean(actual && checks.every(Boolean));

    return {
      verified,
      checkedAt: checkedAt(),
      expected: {
        title: input.title ?? null,
        status: input.status ?? null,
        stage: input.stage ?? null,
        nextAction: input.nextAction ?? null,
        doneCriteria: input.doneCriteria ?? null,
        blockers: input.blockers ?? null,
        tasks: input.tasks ?? null,
      },
      actual: toJsonObject(actual),
      output,
      reason: verified ? undefined : "Active goal re-read did not match the requested update.",
    };
  },
};
