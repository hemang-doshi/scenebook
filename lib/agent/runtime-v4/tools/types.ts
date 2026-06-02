import type { ZodType } from "zod";

import type { AccountContext, PermissionSummary } from "@/lib/auth/account-context";
import type { JsonValue } from "@/lib/types";

export type ToolRiskLevel = "low" | "medium" | "high";

export type ToolSideEffect =
  | "none"
  | "workspace"
  | "external_read"
  | "external_write"
  | "publish"
  | "destructive"
  | "db_write"
  | "asset_generation"
  | "editor_write"
  | "delete";

export type ToolApprovalPolicy =
  | "never"
  | "auto"
  | "ask_if_overwrite"
  | "on_risk"
  | "always";

export type ToolAvailability =
  | "available"
  | "disabled"
  | "stubbed"
  | "requires_integration"
  | "requires_configuration"
  | "unavailable";

export type ToolExecutionContext = {
  userId: string;
  projectId: string;
  threadId?: string;
  runId?: string;
  toolCallId?: string;
  source: "agent" | "test" | "system" | string;
  rawInput?: string;
  selectedModels?: Record<string, string>;
  account?: AccountContext;
  permissions?: PermissionSummary;
  metadata?: Record<string, JsonValue>;
};

export type ToolVerificationResult = {
  verified: boolean;
  checkedAt?: string;
  reason?: string;
  message?: string;
  evidence?: Record<string, JsonValue>;
  expected?: JsonValue;
  actual?: JsonValue;
};

export type ToolHandlerEnvelope<TOutput> = {
  output: TOutput;
  message?: string;
};

export type ToolHandlerResult<TOutput> = TOutput | ToolHandlerEnvelope<TOutput>;

type MaybePromise<T> = T | Promise<T>;

type ToolHandler<TInput, TOutput> = {
  bivarianceHack(
    input: TInput,
    context: ToolExecutionContext,
  ): MaybePromise<ToolHandlerResult<TOutput>>;
}["bivarianceHack"];

type ToolVerifier<TInput, TOutput> = {
  bivarianceHack(
    input: TInput,
    output: TOutput,
    context: ToolExecutionContext,
  ): MaybePromise<ToolVerificationResult>;
}["bivarianceHack"];

export type AgentTool<
  TInput = unknown,
  TOutput extends Record<string, JsonValue> = Record<string, JsonValue>,
> = {
  name: string;
  displayName: string;
  description: string;
  inputSchema: ZodType<TInput>;
  outputSchema: ZodType<TOutput>;
  riskLevel: ToolRiskLevel;
  sideEffect: ToolSideEffect;
  approvalPolicy: ToolApprovalPolicy;
  availability: ToolAvailability;
  handler: ToolHandler<TInput, TOutput>;
  verify?: ToolVerifier<TInput, TOutput>;
};

export type ToolExecutionStatus =
  | "completed"
  | "failed"
  | "awaiting_approval"
  | "blocked";

export type ToolExecutionError = {
  code: string;
  message: string;
  recoverable: boolean;
  details?: JsonValue;
};

export type ToolExecutionPolicy = {
  status: "allowed" | "requires_approval" | "blocked";
  reason?: string;
  approvalType?: string;
  recoverable?: boolean;
  preview?: Record<string, JsonValue>;
};

export type ToolExecutionResult<
  TOutput extends Record<string, JsonValue> = Record<string, JsonValue>,
> = {
  toolName: string;
  toolCallId?: string;
  status: ToolExecutionStatus;
  output?: TOutput;
  message?: string;
  error?: ToolExecutionError;
  policy?: ToolExecutionPolicy;
  verification?: ToolVerificationResult;
  approval?: {
    type: string;
    reason: string;
    preview?: Record<string, JsonValue>;
    requestedAt: string;
  };
  startedAt: string;
  completedAt?: string;
};

export type ToolExecutionRequest = {
  toolName: string;
  input: unknown;
  context: ToolExecutionContext;
  force?: boolean;
};

export type ToolRegistryReader = {
  get(toolName: string): AgentTool | undefined;
  list(): AgentTool[];
};
