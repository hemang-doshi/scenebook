import type { ZodType } from "zod";

import type { AgentModelsSelection, AgentToolCallRecord } from "@/lib/agent/types";
import type { AccountContext, PermissionSummary } from "@/lib/auth/account-context";
import type { CardAsset, ContentFormat, ContentPlatform, ContentStatus, JsonValue, ScriptLab, ShootPack } from "@/lib/types";

export type ToolAvailability =
  | "available"
  | "disabled"
  | "stubbed"
  | "requires_integration"
  | "requires_configuration";

export type ToolSideEffect =
  | "none"
  | "db_write"
  | "asset_generation"
  | "editor_write"
  | "publish"
  | "delete";

export type ToolApprovalPolicy = "auto" | "ask_if_overwrite" | "always";

export type AgentAttachment = {
  name: string;
  type: string;
  size: number;
  url: string;
};

export type AgentRunRequest = {
  projectId: string;
  threadId?: string;
  userId: string;
  message: string;
  attachments?: AgentAttachment[];
  selectedModels?: AgentModelsSelection;
  account?: AccountContext;
  permissions?: PermissionSummary;
};

export const agentWorkflowNames = [
  "script_workflow",
  "workspace_control_workflow",
  "asset_workflow",
  "goal_workflow",
  "editor_handoff_workflow",
  "publish_workflow",
] as const;

export type AgentWorkflowName = (typeof agentWorkflowNames)[number];

export type CreativeBriefState = {
  audience?: string;
  platform?: ContentPlatform | string;
  format?: ContentFormat | string;
  durationSeconds?: number;
  tone?: string;
  coreAngle?: string;
  viewerPromise?: string;
  viewerEmotion?: string;
  creatorPersona?: string;
  visualStyle?: string;
  cta?: string;
  constraints?: string[];
  assumptions?: string[];
  rejectedDirections?: string[];
  openQuestions?: string[];
  approvedFields?: string[];
};

export type AgentGoalStage =
  | "ideating"
  | "briefing"
  | "scripting"
  | "asset_planning"
  | "generating_assets"
  | "editing"
  | "publishing"
  | "analyzing"
  | "complete";

export type AgentGoalState = {
  id?: string;
  title: string;
  status: "active" | "paused" | "complete" | "blocked";
  stage: AgentGoalStage;
  completedSteps: string[];
  nextActions: string[];
  blockers: string[];
  metadata?: Record<string, JsonValue>;
};

export type ProjectReadiness = {
  briefCompleteness: number;
  scriptCompleteness: number;
  assetReadiness: number;
  shootReadiness: number;
  editorReadiness: number;
  publishReadiness: number;
  nextLikelyStage: AgentGoalStage;
  missing: string[];
};

export type ScriptVersionSummary = {
  id: string;
  title: string;
  active: boolean;
  createdAt?: string;
};

export type AssetLibrarySummary = {
  count: number;
  folders: Array<{ id: string; name: string; assetCount: number }>;
  looseAssetCount: number;
  recent: Array<Pick<CardAsset, "id" | "title" | "type" | "url">>;
};

export type ConversationSummary = {
  recentMessages: Array<{ role: string; content: string; createdAt?: string }>;
};

export type ToolCallSummary = {
  id: string;
  toolName: string;
  status: string;
  command?: string | null;
  createdAt?: string;
};

export type ProjectSnapshot = {
  project: {
    id: string;
    title: string;
    platform: ContentPlatform | string;
    format: ContentFormat | string;
    status: ContentStatus | string;
  };
  creativeBrief: CreativeBriefState | null;
  activeGoal: AgentGoalState | null;
  scriptLab: ScriptLab;
  scriptVersions: ScriptVersionSummary[];
  shootPack: ShootPack;
  assets: AssetLibrarySummary;
  editor: { ready: boolean; integrationAvailable: boolean; note: string };
  publish: { ready: boolean; integrationAvailable: boolean; caption?: string | null } | null;
  analytics: Record<string, JsonValue> | null;
  conversation: ConversationSummary;
  toolHistory: ToolCallSummary[];
  memory: Array<{ summary: string; createdAt?: string; metadata?: Record<string, JsonValue> }>;
  readiness: ProjectReadiness;
};

export type AgentPlan = {
  title: string;
  steps: Array<{
    label: string;
    toolName?: string;
    sideEffect?: ToolSideEffect;
    requiresApproval?: boolean;
  }>;
};

export type AgentDecision =
  | { type: "final_response"; response: string; confidence: number }
  | {
      type: "ask_question";
      questions: string[];
      reason: string;
      expectedFieldTargets?: string[];
    }
  | { type: "propose_plan"; plan: AgentPlan; reason: string }
  | { type: "tool_call"; toolName: string; input: unknown; reason: string }
  | { type: "workflow_call"; workflowName: AgentWorkflowName; input: unknown; reason: string }
  | { type: "request_approval"; toolName: string; input: unknown; reason: string }
  | { type: "stop_with_error"; message: string };

export type AgentEventType =
  | "run_started"
  | "snapshot_loaded"
  | "decision"
  | "plan"
  | "tool_planned"
  | "tool_running"
  | "tool_completed"
  | "tool_failed"
  | "approval_required"
  | "goal_updated"
  | "message_delta"
  | "run_completed"
  | "v4_event"
  | "run_failed";

export type AgentStreamEvent = {
  type: AgentEventType;
  [key: string]: JsonValue | undefined;
};

export type ToolContext = {
  projectId: string;
  threadId: string;
  runId: string;
  toolCallId?: string;
  userId: string;
  rawInput: string;
  snapshot: ProjectSnapshot;
  selectedModels?: AgentModelsSelection;
};

export type ToolResult<TOutput extends Record<string, JsonValue> = Record<string, JsonValue>> = {
  message: string;
  output: TOutput;
};

export type VerificationResult = {
  verified: boolean;
  evidence?: Record<string, JsonValue>;
  message?: string;
};

export type AgentTool<TInput = unknown, TOutput extends Record<string, JsonValue> = Record<string, JsonValue>> = {
  name: string;
  displayName: string;
  description: string;
  inputSchema: ZodType<TInput>;
  outputSchema: ZodType<TOutput>;
  sideEffect: ToolSideEffect;
  approvalPolicy: ToolApprovalPolicy;
  availability: ToolAvailability;
  handler: (ctx: ToolContext, input: TInput) => Promise<ToolResult<TOutput>> | ToolResult<TOutput>;
  verify?: (ctx: ToolContext, result: ToolResult<TOutput>) => Promise<VerificationResult> | VerificationResult;
};

export type PolicyResult = {
  allowed: boolean;
  requiresApproval: boolean;
  risk: "low" | "medium" | "high" | "blocked";
  reason: string;
  preview?: Record<string, JsonValue>;
};

export type ToolObservation = {
  toolName: string;
  toolCallId?: string;
  status: "completed" | "failed" | "awaiting_approval" | "blocked";
  message: string;
  output?: Record<string, JsonValue>;
  policy?: PolicyResult;
  record?: AgentToolCallRecord;
};
