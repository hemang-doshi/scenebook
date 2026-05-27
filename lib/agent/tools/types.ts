import type { ZodType } from "zod";

import type { ProjectWorkspace } from "@/lib/data/repository";
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
};

export type AgentToolResult = {
  message: string;
  output: Record<string, JsonValue>;
  saveAsAssistantMessage?: boolean;
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
