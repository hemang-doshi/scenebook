import type { JsonValue } from "@/lib/types";

export const agentCommands = [
  "script",
  "form-json-prompt",
  "generate",
  "generate-image",
  "generate-video",
  "generate-audio",
  "storyboard",
  "tasks",
  "instagram",
  "analyze",
  "import-to-editor",
  "export",
] as const;

export const agentMessageRoles = ["user", "assistant", "system", "tool"] as const;
export const agentRunStatuses = ["queued", "running", "completed", "failed"] as const;
export const agentToolCallStatuses = [
  "running",
  "completed",
  "failed",
  "awaiting_approval",
  "approved",
  "rejected",
  "awaiting_input",
] as const;

export type AgentCommand = (typeof agentCommands)[number];
export const streamingAgentCommands = [
  "script",
  "form-json-prompt",
  "storyboard",
  "tasks",
  "instagram",
  "analyze",
  "import-to-editor",
  "export",
] as const satisfies readonly AgentCommand[];

export const assetAgentCommands = [
  "generate",
  "generate-image",
  "generate-video",
  "generate-audio",
] as const satisfies readonly AgentCommand[];

export type StreamingAgentCommand = (typeof streamingAgentCommands)[number];
export type AssetAgentCommand = (typeof assetAgentCommands)[number];
export type AgentMessageRole = (typeof agentMessageRoles)[number];
export type AgentRunStatus = (typeof agentRunStatuses)[number];
export type AgentToolCallStatus = (typeof agentToolCallStatuses)[number];
export type AgentModelsSelection = Record<string, string>;

export type PromptJsonOutput = {
  kind: "prompt_json";
  modality: "image" | "video" | "audio";
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: "9:16" | "16:9" | "1:1";
  width?: number;
  height?: number;
  duration_seconds?: number;
  subject?: {
    primary?: string;
    age?: string;
    wardrobe?: string;
    appearance?: string;
    action?: string;
    emotion?: string;
    color?: string;
  };
  scene?: {
    location?: string;
    setting?: string;
    time_of_day?: string;
    environment?: string;
    background?: string;
    atmosphere?: string;
  };
  camera?: {
    shot_type?: string;
    angle?: string;
    lens?: string;
    framing?: string;
    movement?: string;
    focus?: string;
    reveal?: string;
  };
  lighting?: {
    style?: string;
    quality?: string;
    direction?: string;
    color?: string;
  };
  style?: {
    aesthetic?: string;
    color_palette?: string;
    texture?: string;
  };
  output?: {
    aspect_ratio?: "9:16" | "16:9" | "1:1";
    width?: number;
    height?: number;
    duration_seconds?: number;
  };
  parameters?: Record<string, string | number | boolean>;
};

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
  status: AgentToolCallStatus | string;
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
