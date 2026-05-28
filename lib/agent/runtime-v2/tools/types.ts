import type { ZodType } from "zod";

import type { ProjectWorkspace } from "@/lib/data/repository";
import type { JsonValue } from "@/lib/types";

export type AgentRuntimeToolSideEffect =
  | "none"
  | "db_write"
  | "asset_generation"
  | "editor_write"
  | "publish";

export type AgentRuntimeToolApprovalPolicy = "auto" | "ask_if_overwrite" | "always";

export type AgentRuntimeToolContext = {
  projectId: string;
  threadId?: string;
  runId?: string;
  toolCallId?: string;
  rawInput?: string;
  project: ProjectWorkspace | null;
  selectedModel?: string | null;
  selectedModels?: Record<string, string> | null;
  emitProgress?: (activity: string) => Promise<void> | void;
};

export type AgentRuntimeToolDisplay = {
  title: string;
  subtitle?: string;
  metadata?: Record<string, JsonValue | undefined>;
};

export type AgentRuntimeToolResult<TOutput = Record<string, JsonValue>> = {
  message: string;
  output: TOutput;
  display?: AgentRuntimeToolDisplay;
};

type AgentRuntimeToolHandler<TInput, TOutput> = {
  handle(
    ctx: AgentRuntimeToolContext,
    input: TInput,
  ): Promise<AgentRuntimeToolResult<TOutput>> | AgentRuntimeToolResult<TOutput>;
}["handle"];

type AgentRuntimeToolDisplayFormatter<TInput, TOutput> = {
  format(input: TInput, result?: AgentRuntimeToolResult<TOutput>): AgentRuntimeToolDisplay;
}["format"];

export type AgentRuntimeTool<TInput = unknown, TOutput = Record<string, JsonValue>> = {
  name: string;
  displayName: string;
  description: string;
  inputSchema: ZodType<TInput>;
  outputSchema?: ZodType<TOutput>;
  sideEffect: AgentRuntimeToolSideEffect;
  approvalPolicy: AgentRuntimeToolApprovalPolicy;
  handler: AgentRuntimeToolHandler<TInput, TOutput>;
  displayFormatter: AgentRuntimeToolDisplayFormatter<TInput, TOutput>;
};

export type AgentPlugin = {
  name: string;
  description: string;
  capabilities: string[];
  tools: readonly AgentRuntimeTool[];
};
