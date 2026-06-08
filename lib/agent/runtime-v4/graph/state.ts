import { Annotation } from "@langchain/langgraph";

import type { AgentPlan, ToolObservation } from "@/lib/agent/runtime-v3/types";
import type { AgentDecision, GoalCheck } from "@/lib/agent/runtime-v4/decision/schemas";
import type { RuntimeV4Event } from "@/lib/agent/runtime-v4/events";
import type { AgentCommand, AgentIntentHint } from "@/lib/agent/types";
import type {
  CompactProjectMind,
  ProjectMindSnapshot,
} from "@/lib/agent/runtime-v4/memory/memory-types";
import type { AccountContext, PermissionSummary } from "@/lib/auth/account-context";
import type { JsonValue } from "@/lib/types";

export type SceneBookGraphMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  metadata?: Record<string, JsonValue>;
};

export type SceneBookGraphObservation = {
  type:
    | "project_mind_loaded"
    | "intent_understood"
    | "decision_made"
    | "plan_proposed"
    | "step_executed"
    | "result_observed"
    | "goal_checked"
    | "final_response"
    | "error";
  message: string;
  data?: Record<string, JsonValue>;
};

export type SceneBookGraphIntent = {
  intentType?: "create_reel" | "revise_script" | "workspace_update" | "integration_request" | "general_chat";
  summary: string;
  requestedFormat: string | null;
  topic: string | null;
  confidence: number;
  creativeMode?: "plan" | "goal" | "create" | "review" | "workspace";
  needsClarification?: boolean;
  clarificationQuestion?: string;
  inferredGoal?: string;
  needsWorkspaceMutation: boolean;
};

export type SceneBookGraphGoal = {
  originalRequest: string;
  status: "active" | "satisfied" | "blocked";
  reason?: string;
};

export type SceneBookGraphApprovalRequest = {
  toolName: string;
  reason: string;
  preview?: Record<string, JsonValue>;
};

export type SceneBookGraphAskQuestion = Extract<AgentDecision, { type: "ask_question" }>;

export type SceneBookGraphStopReason =
  | "final_response"
  | "ask_question"
  | "approval_required"
  | "unrecoverable_error"
  | "max_steps"
  | "goal_satisfied";

export type SceneBookGraphPlan = AgentPlan;

function appendValues<T>(left: T[] = [], right: T[] = []) {
  return [...left, ...right];
}

function replaceValue<T>(left: T | undefined, right: T | undefined) {
  return right ?? left;
}

function replaceNumber(left = 0, right = 0) {
  return right ?? left;
}

export const SceneBookGraphAnnotation = Annotation.Root({
  projectId: Annotation<string>(),
  userId: Annotation<string>(),
  account: Annotation<AccountContext | undefined>({
    reducer: replaceValue,
  }),
  permissions: Annotation<PermissionSummary | undefined>({
    reducer: replaceValue,
  }),
  threadId: Annotation<string | undefined>(),
  runId: Annotation<string | undefined>(),
  goal: Annotation<string>(),
  effectivePrompt: Annotation<string | undefined>({
    reducer: replaceValue,
  }),
  commandHint: Annotation<AgentCommand | null | undefined>({
    reducer: replaceValue,
  }),
  commandInput: Annotation<string | null | undefined>({
    reducer: replaceValue,
  }),
  intentHint: Annotation<AgentIntentHint | null | undefined>({
    reducer: replaceValue,
  }),
  currentGoal: Annotation<SceneBookGraphGoal | undefined>({
    reducer: replaceValue,
  }),
  messages: Annotation<SceneBookGraphMessage[]>({
    reducer: appendValues,
    default: () => [],
  }),
  observations: Annotation<SceneBookGraphObservation[]>({
    reducer: appendValues,
    default: () => [],
  }),
  events: Annotation<RuntimeV4Event[]>({
    reducer: appendValues,
    default: () => [],
  }),
  projectMind: Annotation<ProjectMindSnapshot | undefined>({
    reducer: replaceValue,
  }),
  compactProjectMind: Annotation<CompactProjectMind | undefined>({
    reducer: replaceValue,
  }),
  currentIntent: Annotation<SceneBookGraphIntent | undefined>({
    reducer: replaceValue,
  }),
  intent: Annotation<SceneBookGraphIntent | undefined>({
    reducer: replaceValue,
  }),
  currentDecision: Annotation<AgentDecision | undefined>({
    reducer: replaceValue,
  }),
  currentGoalCheck: Annotation<GoalCheck | undefined>({
    reducer: replaceValue,
  }),
  plan: Annotation<SceneBookGraphPlan | undefined>({
    reducer: replaceValue,
  }),
  toolResults: Annotation<ToolObservation[]>({
    reducer: appendValues,
    default: () => [],
  }),
  approvalRequest: Annotation<SceneBookGraphApprovalRequest | undefined>({
    reducer: replaceValue,
  }),
  askQuestion: Annotation<SceneBookGraphAskQuestion | undefined>({
    reducer: replaceValue,
  }),
  finalResponse: Annotation<string | undefined>({
    reducer: replaceValue,
  }),
  errors: Annotation<string[]>({
    reducer: appendValues,
    default: () => [],
  }),
  stepCount: Annotation<number>({
    reducer: replaceNumber,
    default: () => 0,
  }),
  maxSteps: Annotation<number>({
    reducer: replaceNumber,
    default: () => 8,
  }),
  stopReason: Annotation<SceneBookGraphStopReason | undefined>({
    reducer: replaceValue,
  }),
});

export type SceneBookGraphState = typeof SceneBookGraphAnnotation.State;
export type SceneBookGraphUpdate = typeof SceneBookGraphAnnotation.Update;

export type SceneBookGraphInput = {
  projectId: string;
  userId: string;
  account?: AccountContext;
  permissions?: PermissionSummary;
  threadId?: string;
  runId?: string;
  goal: string;
  effectivePrompt?: string | null;
  commandHint?: AgentCommand | null;
  commandInput?: string | null;
  intentHint?: AgentIntentHint | null;
  messages?: SceneBookGraphMessage[];
  maxSteps?: number;
};
