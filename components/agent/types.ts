export type AgentTimelineBase = {
  id: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type MessageTimelineEntry = AgentTimelineBase & {
  kind: "message";
  role: "user" | "assistant" | "system";
  content: string;
};

export type AgentArtifactType =
  | "creative_brief"
  | "script_package"
  | "shoot_pack"
  | "asset_prompt_pack"
  | "publish_package"
  | "content_review"
  | "full_production_package"
  | string;

export type ArtifactTimelineEntry = AgentTimelineBase & {
  kind: "artifact";
  artifactType: AgentArtifactType;
  title: string;
  summary?: string | null;
  payload?: Record<string, unknown>;
};

export type WorkflowPatchState = {
  patchId?: string | null;
  title?: string | null;
  summary?: string | null;
  status?: string | null;
  planned?: boolean;
  applied?: boolean;
  autoApplySkippedReason?: string | null;
};

export type WorkflowTimelineEntry = AgentTimelineBase & {
  kind: "workflow";
  workflowName: string;
  displayName?: string | null;
  status: string;
  summary: string;
  artifacts?: ArtifactTimelineEntry[];
  patch?: WorkflowPatchState | null;
  nextAction?: string | null;
};

export type PatchOperationTimelineEntry = {
  operationIndex: number;
  type: string;
  status?: string | null;
  reason?: string | null;
  message?: string | null;
  retryable?: boolean;
  error?: string | { message?: string | null } | null;
};

export type PatchTimelineEntry = AgentTimelineBase & {
  kind: "patch";
  patchId: string;
  title: string;
  summary?: string | null;
  status: string;
  riskLevel?: "low" | "medium" | "high" | "blocked" | string | null;
  requiresApproval?: boolean;
  autoApplySkippedReason?: string | null;
  operations: PatchOperationTimelineEntry[];
  canApply?: boolean;
};

export type ToolTimelineEntry = AgentTimelineBase & {
  kind: "tool";
  toolName: string;
  command?: string | null;
  status: string;
  requiresApproval: boolean;
  output: unknown;
  errorMessage?: string | null;
};

export type MemoryTimelineEntry = AgentTimelineBase & {
  kind: "memory";
  title?: string | null;
  summary: string;
  memoryType?: string | null;
};

export type AgentTimelineEntry =
  | MessageTimelineEntry
  | WorkflowTimelineEntry
  | PatchTimelineEntry
  | ArtifactTimelineEntry
  | ToolTimelineEntry
  | MemoryTimelineEntry;

export type AgentUiMessage = MessageTimelineEntry;
export type AgentUiToolCall = ToolTimelineEntry;
export type AgentUiEntry = AgentTimelineEntry;
