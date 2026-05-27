import type { JsonValue } from "@/lib/types";

export const agentCommands = [
  "script",
  "form-json-prompt",
  "generate",
  "storyboard",
  "tasks",
  "instagram",
  "analyze",
  "import-to-editor",
  "export",
] as const;

export const agentMessageRoles = ["user", "assistant", "system", "tool"] as const;
export const agentRunStatuses = ["queued", "running", "completed", "failed"] as const;

export type AgentCommand = (typeof agentCommands)[number];
export type AgentMessageRole = (typeof agentMessageRoles)[number];
export type AgentRunStatus = (typeof agentRunStatuses)[number];
export type AgentModelsSelection = Record<string, string>;

export type AgentThreadRecord = {
  id: string;
  owner_id: string;
  project_id: string;
  title: string;
  status: string;
  metadata: Record<string, JsonValue>;
  created_at?: string;
  updated_at?: string;
};

export type AgentMessageRecord = {
  id: string;
  owner_id: string;
  thread_id: string;
  project_id: string;
  role: AgentMessageRole;
  content: string;
  model?: string | null;
  provider?: string | null;
  metadata: Record<string, JsonValue>;
  created_at?: string;
};

export type AgentRunRecord = {
  id: string;
  owner_id: string;
  thread_id: string;
  project_id: string;
  status: AgentRunStatus | string;
  input: string;
  selected_models: AgentModelsSelection;
  metadata: Record<string, JsonValue>;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
};

export type AgentToolCallRecord = {
  id: string;
  owner_id: string;
  run_id: string;
  thread_id: string;
  project_id: string;
  tool_name: string;
  command?: string | null;
  status: string;
  input: Record<string, JsonValue>;
  output: Record<string, JsonValue>;
  error_message?: string | null;
  requires_approval: boolean;
  approved_at?: string | null;
  created_at?: string;
  completed_at?: string | null;
};

export type AgentHistory = {
  thread: AgentThreadRecord | null;
  messages: AgentMessageRecord[];
  toolCalls: AgentToolCallRecord[];
};

export type ParsedSlashCommand = {
  command: AgentCommand | null;
  input: string;
  isCommand: boolean;
};
