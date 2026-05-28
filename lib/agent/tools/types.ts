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
  requiresApproval: boolean;
  sideEffect: AgentToolSideEffect;
  handler: (ctx: AgentToolContext, input: TInput) => Promise<AgentToolResult> | AgentToolResult;
};
