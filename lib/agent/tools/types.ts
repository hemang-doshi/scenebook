import type { ZodType } from "zod";

import type { ProjectWorkspace } from "@/lib/data/repository";
import type { AgentToolCallStatus } from "@/lib/agent/types";
import type { JsonValue } from "@/lib/types";

export type AgentToolSideEffect =
  | "none"
  | "db_write"
  | "asset_generation"
  | "publish"
  | "editor_write";

export type AgentToolAvailability =
  | "available"
  | "disabled"
  | "stubbed"
  | "requires_integration"
  | "requires_configuration";

export type AgentToolApprovalPolicy = "auto" | "ask_if_overwrite" | "always";

export type AgentToolVerificationResult = {
  verified: boolean;
  evidence?: Record<string, JsonValue>;
  message?: string;
};

export type AgentToolContext = {
  projectId: string;
  threadId: string;
  runId: string;
  rawInput: string;
  project: ProjectWorkspace | null;
  selectedModel?: string | null;
  selectedModels?: Record<string, string> | null;
  emitProgress?: (activity: string) => Promise<void> | void;
};

export type AgentToolResult = {
  message: string;
  output: Record<string, JsonValue>;
  saveAsAssistantMessage?: boolean;
  status?: AgentToolCallStatus;
};

export type AgentTool<TInput = unknown> = {
  name: string;
  command: string;
  description: string;
  inputSchema: ZodType<TInput>;
  outputSchema?: ZodType<Record<string, JsonValue>>;
  requiresApproval: boolean;
  approvalPolicy?: AgentToolApprovalPolicy;
  sideEffect: AgentToolSideEffect;
  availability?: AgentToolAvailability;
  handler: (ctx: AgentToolContext, input: TInput) => Promise<AgentToolResult> | AgentToolResult;
  verify?: (ctx: AgentToolContext, result: AgentToolResult) => Promise<AgentToolVerificationResult> | AgentToolVerificationResult;
};
