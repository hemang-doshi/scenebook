import type {
  AgentMessageRecord,
  AgentToolCallRecord,
} from "@/lib/agent/types";
import { projectPatchOperationToolNames } from "@/lib/agent/runtime-v4/patch/project-patch";
import type { JsonValue } from "@/lib/types";

type JsonObject = Record<string, JsonValue>;
type PersistedRow = Record<string, unknown>;
const runtimeV4PlannedPatchMarker = "runtime-v4-workflow";

type TimelineQueryResult<T extends PersistedRow> = {
  data: T[] | null;
  error: unknown;
};

type TimelineQueryBuilder<T extends PersistedRow> = {
  select(columns: string): TimelineQueryBuilder<T>;
  eq(column: string, value: string): TimelineQueryBuilder<T>;
  order(column: string, options: { ascending: boolean }): Promise<TimelineQueryResult<T>>;
};

export type TimelineSupabaseClient = {
  from(table: string): TimelineQueryBuilder<PersistedRow>;
};

export type AgentProjectPatchOperationEntry = {
  id: string;
  operationIndex: number;
  type: string;
  operationType: string;
  toolName: string;
  status: string;
  reason: string | null;
  message: string | null;
  input: JsonObject;
  output: JsonObject;
  error: JsonObject;
  verification: JsonObject;
  retryable: boolean;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
};

type TimelineEntryType = "message" | "workflow" | "patch" | "artifact" | "tool" | "summary";
type TimelineEntryKind = Exclude<TimelineEntryType, "summary"> | "memory";

type TimelineBaseEntry = {
  id: string;
  type: TimelineEntryType;
  kind: TimelineEntryKind;
  projectId: string | null;
  threadId: string | null;
  runId: string | null;
  createdAt: string | null;
};

export type MessageEntry = TimelineBaseEntry & {
  type: "message";
  kind: "message";
  messageId: string;
  role: string;
  content: string;
  model: string | null;
  provider: string | null;
  metadata: JsonObject;
};

export type ToolEntry = TimelineBaseEntry & {
  type: "tool";
  kind: "tool";
  toolCallId: string;
  toolName: string;
  command: string | null;
  status: string;
  input: JsonObject;
  output: JsonObject;
  requiresApproval: boolean;
  approvedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  risk: string | null;
  approvalReason: string | null;
  verification: JsonObject | null;
  availability: string | null;
  sideEffect: string | null;
  approvalPolicy: string | null;
};

export type WorkflowEntry = TimelineBaseEntry & {
  type: "workflow";
  kind: "workflow";
  workflowName: string;
  displayName: string | null;
  title: string;
  summary: string | null;
  status: string | null;
  eventType: string | null;
  sourceType: "patch" | "artifact";
  sourceId: string;
  sourceStatus: string | null;
  metadata: JsonObject;
};

export type PatchEntry = TimelineBaseEntry & {
  type: "patch";
  kind: "patch";
  patchId: string;
  title: string;
  summary: string;
  reason: string | null;
  status: string;
  riskLevel: string;
  requiresApproval: boolean;
  successfulOperations: number;
  failedOperations: number;
  retryable: boolean;
  operationCount: number;
  operations: AgentProjectPatchOperationEntry[];
  canApply: boolean;
  patch: JsonObject;
  metadata: JsonObject;
  workflowName: string | null;
  autoApplySkipped: boolean | null;
  autoApplyReason: string | null;
  autoApplySkippedReason: string | null;
  completedAt: string | null;
  updatedAt: string | null;
};

export type ArtifactEntry = TimelineBaseEntry & {
  type: "artifact";
  kind: "artifact";
  artifactId: string;
  artifactType: string;
  title: string;
  summary: string | null;
  payload: JsonObject;
  metadata: JsonObject;
  workflowName: string | null;
  toolCallId: string | null;
  updatedAt: string | null;
};

export type SummaryEntry = TimelineBaseEntry & {
  type: "summary";
  kind: "memory";
  summaryId: string;
  memoryType: "agent_summary";
  title: string | null;
  userGoal: string;
  summary: string;
  actionsTaken: JsonValue[];
  workspaceChanges: JsonValue[];
  selectedOutputs: JsonValue[];
  rejectedOutputs: JsonValue[];
  openNextSteps: JsonValue[];
  metadata: JsonObject;
};

export type RuntimeV4TimelineEntry =
  | MessageEntry
  | ToolEntry
  | WorkflowEntry
  | PatchEntry
  | ArtifactEntry
  | SummaryEntry;

export type RuntimeV4TimelineRows = {
  messages?: PersistedRow[];
  toolCalls?: PersistedRow[];
  patches?: PersistedRow[];
  patchOperations?: PersistedRow[];
  artifacts?: PersistedRow[];
  runSummaries?: PersistedRow[];
};

export type LoadRuntimeV4TimelineInput = {
  supabase: TimelineSupabaseClient;
  ownerId: string;
  projectId: string;
  threadId: string;
  messages?: AgentMessageRecord[];
  toolCalls?: AgentToolCallRecord[];
};

function isRecord(value: unknown): value is PersistedRow {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonValue(value: unknown): JsonValue {
  if (value === undefined) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value)) as JsonValue;
  } catch {
    return null;
  }
}

function jsonObject(value: unknown): JsonObject {
  if (!isRecord(value)) {
    return {};
  }

  const cloned = jsonValue(value);
  return isRecord(cloned) ? cloned as JsonObject : {};
}

function jsonArray(value: unknown): JsonValue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const cloned = jsonValue(value);
  return Array.isArray(cloned) ? cloned : [];
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredString(value: unknown, fallback: string): string {
  return stringValue(value) ?? fallback;
}

function boolValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function requiredBool(value: unknown, fallback = false): boolean {
  return boolValue(value) ?? fallback;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function requiredNumber(value: unknown, fallback = 0): number {
  return numberValue(value) ?? fallback;
}

function dateValue(value: unknown): string | null {
  return stringValue(value);
}

function entryTime(entry: RuntimeV4TimelineEntry) {
  if (!entry.createdAt) {
    return 0;
  }

  const parsed = Date.parse(entry.createdAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowId(row: PersistedRow, fallbackPrefix: string) {
  return stringValue(row.id) ?? `${fallbackPrefix}-${crypto.randomUUID()}`;
}

function mapMessage(row: PersistedRow): MessageEntry {
  const messageId = rowId(row, "message");
  return {
    id: `message:${messageId}`,
    type: "message",
    kind: "message",
    messageId,
    projectId: stringValue(row.project_id),
    threadId: stringValue(row.thread_id),
    runId: stringValue(row.run_id),
    createdAt: dateValue(row.created_at),
    role: requiredString(row.role, "assistant"),
    content: requiredString(row.content, ""),
    model: stringValue(row.model),
    provider: stringValue(row.provider),
    metadata: jsonObject(row.metadata),
  };
}

function mapToolCall(row: PersistedRow): ToolEntry {
  const toolCallId = rowId(row, "tool");
  const verification = isRecord(row.verification) ? jsonObject(row.verification) : null;
  return {
    id: `tool:${toolCallId}`,
    type: "tool",
    kind: "tool",
    toolCallId,
    projectId: stringValue(row.project_id),
    threadId: stringValue(row.thread_id),
    runId: stringValue(row.run_id),
    createdAt: dateValue(row.created_at),
    toolName: requiredString(row.tool_name, "agent_tool"),
    command: stringValue(row.command),
    status: requiredString(row.status, "running"),
    input: jsonObject(row.input),
    output: jsonObject(row.output),
    requiresApproval: requiredBool(row.requires_approval),
    approvedAt: dateValue(row.approved_at),
    completedAt: dateValue(row.completed_at),
    errorMessage: stringValue(row.error_message),
    risk: stringValue(row.risk),
    approvalReason: stringValue(row.approval_reason),
    verification,
    availability: stringValue(row.availability),
    sideEffect: stringValue(row.side_effect),
    approvalPolicy: stringValue(row.approval_policy),
  };
}

function patchOperationArray(patch: JsonObject) {
  return Array.isArray(patch.operations) ? patch.operations : [];
}

function patchOperationToolName(operationType: string) {
  return operationType in projectPatchOperationToolNames
    ? projectPatchOperationToolNames[operationType as keyof typeof projectPatchOperationToolNames]
    : operationType;
}

function operationCount(input: {
  patch: JsonObject;
  metadata: JsonObject;
  operations: AgentProjectPatchOperationEntry[];
  successfulOperations: number;
  failedOperations: number;
}) {
  const metadataOperationCount = numberValue(input.metadata.operationCount);
  if (metadataOperationCount !== null) {
    return metadataOperationCount;
  }

  const embeddedOperationCount = patchOperationArray(input.patch).length;
  if (embeddedOperationCount > 0) {
    return embeddedOperationCount;
  }

  if (input.operations.length > 0) {
    return input.operations.length;
  }

  return input.successfulOperations + input.failedOperations;
}

function mapPatchOperation(row: PersistedRow): AgentProjectPatchOperationEntry {
  const operationType = requiredString(row.operation_type, "unknown_operation");
  return {
    id: rowId(row, "patch-operation"),
    operationIndex: requiredNumber(row.operation_index),
    type: operationType,
    operationType,
    toolName: requiredString(row.tool_name, operationType),
    status: requiredString(row.status, "planned"),
    reason: stringValue(row.reason),
    message: stringValue(row.message),
    input: jsonObject(row.input),
    output: jsonObject(row.output),
    error: jsonObject(row.error),
    verification: jsonObject(row.verification),
    retryable: requiredBool(row.retryable),
    startedAt: dateValue(row.started_at),
    completedAt: dateValue(row.completed_at),
    createdAt: dateValue(row.created_at),
  };
}

function canApplyHydratedPatch(status: string, metadata: JsonObject) {
  return status === "planned" && stringValue(metadata.plannedBy) === runtimeV4PlannedPatchMarker;
}

function previewStatusForPatchOperation(patchStatus: string) {
  return patchStatus === "planned" ? "planned" : patchStatus;
}

function mapEmbeddedPatchOperation(
  operation: JsonValue,
  index: number,
  patchId: string,
  patchStatus: string,
  patchCreatedAt: string | null,
): AgentProjectPatchOperationEntry | null {
  if (!isRecord(operation)) {
    return null;
  }

  const operationType = stringValue(operation.type);
  if (!operationType) {
    return null;
  }

  const reason = stringValue(operation.reason);
  return {
    id: `patch-operation-preview:${patchId}:${index}`,
    operationIndex: index,
    type: operationType,
    operationType,
    toolName: patchOperationToolName(operationType),
    status: previewStatusForPatchOperation(patchStatus),
    reason,
    message: reason,
    input: jsonObject(operation.input),
    output: {},
    error: {},
    verification: {},
    retryable: false,
    startedAt: null,
    completedAt: null,
    createdAt: patchCreatedAt,
  };
}

function mapPatch(row: PersistedRow, operationsByPatchId: Map<string, AgentProjectPatchOperationEntry[]>): PatchEntry {
  const patchId = rowId(row, "patch");
  const patch = jsonObject(row.patch);
  const metadata = jsonObject(row.metadata);
  const status = requiredString(row.status, "planned");
  const persistedOperations = operationsByPatchId.get(patchId) ?? [];
  const autoApplySkippedReason = stringValue(metadata.autoApplySkippedReason)
    ?? stringValue(metadata.autoApplyReason);
  const operations = (persistedOperations.length > 0
    ? persistedOperations
    : patchOperationArray(patch)
        .map((operation, index) =>
          mapEmbeddedPatchOperation(operation, index, patchId, status, dateValue(row.created_at)),
        )
        .filter((operation): operation is AgentProjectPatchOperationEntry => Boolean(operation))
  ).sort(
    (left, right) => left.operationIndex - right.operationIndex,
  );
  const successfulOperations = requiredNumber(row.successful_operations);
  const failedOperations = requiredNumber(row.failed_operations);

  return {
    id: `patch:${patchId}`,
    type: "patch",
    kind: "patch",
    patchId,
    projectId: stringValue(row.project_id),
    threadId: stringValue(row.thread_id),
    runId: stringValue(row.run_id),
    createdAt: dateValue(row.created_at),
    title: requiredString(row.title, "Project patch"),
    summary: requiredString(row.summary, ""),
    reason: stringValue(row.reason),
    status,
    riskLevel: requiredString(row.risk_level, "low"),
    requiresApproval: requiredBool(row.requires_approval),
    successfulOperations,
    failedOperations,
    retryable: requiredBool(row.retryable),
    operationCount: operationCount({
      patch,
      metadata,
      operations,
      successfulOperations,
      failedOperations,
    }),
    operations,
    canApply: canApplyHydratedPatch(status, metadata),
    patch,
    metadata,
    workflowName: stringValue(metadata.workflowName),
    autoApplySkipped: boolValue(metadata.autoApplySkipped),
    autoApplyReason: stringValue(metadata.autoApplyReason),
    autoApplySkippedReason,
    completedAt: dateValue(row.completed_at),
    updatedAt: dateValue(row.updated_at),
  };
}

function mapArtifact(row: PersistedRow): ArtifactEntry {
  const artifactId = rowId(row, "artifact");
  const payload = jsonObject(row.payload);
  const metadata = jsonObject(row.metadata);

  return {
    id: `artifact:${artifactId}`,
    type: "artifact",
    kind: "artifact",
    artifactId,
    projectId: stringValue(row.project_id),
    threadId: stringValue(row.thread_id),
    runId: stringValue(row.run_id),
    createdAt: dateValue(row.created_at),
    artifactType: requiredString(row.artifact_type, "project_artifact"),
    title: requiredString(row.title, "Project artifact"),
    summary: stringValue(metadata.summary) ?? stringValue(payload.summary) ?? stringValue(payload.description),
    payload,
    metadata,
    workflowName: stringValue(metadata.workflowName),
    toolCallId: stringValue(row.tool_call_id),
    updatedAt: dateValue(row.updated_at),
  };
}

function workflowEntryFromPatch(row: PersistedRow): WorkflowEntry | null {
  const metadata = jsonObject(row.metadata);
  const workflowName = stringValue(metadata.workflowName);
  if (!workflowName) {
    return null;
  }

  const patchId = rowId(row, "patch");
  const title = stringValue(metadata.workflowTitle) ?? workflowName;
  return {
    id: `workflow:patch:${patchId}`,
    type: "workflow",
    kind: "workflow",
    projectId: stringValue(row.project_id),
    threadId: stringValue(row.thread_id),
    runId: stringValue(row.run_id),
    createdAt: dateValue(row.created_at),
    workflowName,
    displayName: title,
    title,
    summary: stringValue(metadata.workflowSummary) ?? stringValue(row.summary),
    status: stringValue(metadata.workflowStatus),
    eventType: stringValue(metadata.eventType) ?? stringValue(metadata.workflowEventType),
    sourceType: "patch",
    sourceId: patchId,
    sourceStatus: stringValue(row.status),
    metadata,
  };
}

function workflowEntryFromArtifact(row: PersistedRow): WorkflowEntry | null {
  const metadata = jsonObject(row.metadata);
  const workflowName = stringValue(metadata.workflowName);
  if (!workflowName) {
    return null;
  }

  const artifactId = rowId(row, "artifact");
  const payload = jsonObject(row.payload);
  const title = stringValue(metadata.workflowTitle) ?? workflowName;
  return {
    id: `workflow:artifact:${artifactId}`,
    type: "workflow",
    kind: "workflow",
    projectId: stringValue(row.project_id),
    threadId: stringValue(row.thread_id),
    runId: stringValue(row.run_id),
    createdAt: dateValue(row.created_at),
    workflowName,
    displayName: title,
    title,
    summary: stringValue(metadata.workflowSummary) ?? stringValue(payload.summary),
    status: stringValue(metadata.workflowStatus),
    eventType: stringValue(metadata.eventType) ?? stringValue(metadata.workflowEventType),
    sourceType: "artifact",
    sourceId: artifactId,
    sourceStatus: stringValue(metadata.status),
    metadata,
  };
}

function mapRunSummary(row: PersistedRow): SummaryEntry {
  const summaryId = rowId(row, "summary");
  return {
    id: `summary:${summaryId}`,
    type: "summary",
    kind: "memory",
    summaryId,
    memoryType: "agent_summary",
    title: stringValue(row.user_goal),
    projectId: stringValue(row.project_id),
    threadId: stringValue(row.thread_id),
    runId: stringValue(row.run_id),
    createdAt: dateValue(row.created_at),
    userGoal: requiredString(row.user_goal, ""),
    summary: requiredString(row.summary, ""),
    actionsTaken: jsonArray(row.actions_taken),
    workspaceChanges: jsonArray(row.workspace_changes),
    selectedOutputs: jsonArray(row.selected_outputs),
    rejectedOutputs: jsonArray(row.rejected_outputs),
    openNextSteps: jsonArray(row.open_next_steps),
    metadata: jsonObject(row.metadata),
  };
}

export function buildRuntimeV4TimelineEntries(rows: RuntimeV4TimelineRows): RuntimeV4TimelineEntry[] {
  const patchOperations = (rows.patchOperations ?? []).map(mapPatchOperation);
  const operationsByPatchId = patchOperations.reduce((grouped, operation, index) => {
    const row = rows.patchOperations?.[index];
    const patchId = row ? stringValue(row.patch_id) : null;
    if (!patchId) {
      return grouped;
    }

    grouped.set(patchId, [...(grouped.get(patchId) ?? []), operation]);
    return grouped;
  }, new Map<string, AgentProjectPatchOperationEntry[]>());

  const patches = rows.patches ?? [];
  const artifacts = rows.artifacts ?? [];
  const entries: RuntimeV4TimelineEntry[] = [
    ...(rows.messages ?? []).map(mapMessage),
    ...patches.map(workflowEntryFromPatch).filter((entry): entry is WorkflowEntry => Boolean(entry)),
    ...patches.map((row) => mapPatch(row, operationsByPatchId)),
    ...artifacts.map(workflowEntryFromArtifact).filter((entry): entry is WorkflowEntry => Boolean(entry)),
    ...artifacts.map(mapArtifact),
    ...(rows.toolCalls ?? []).map(mapToolCall),
    ...(rows.runSummaries ?? []).map(mapRunSummary),
  ];

  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => entryTime(left.entry) - entryTime(right.entry) || left.index - right.index)
    .map(({ entry }) => entry);
}

async function selectTimelineRows(
  supabase: TimelineSupabaseClient,
  table: string,
  ownerId: string,
  projectId: string,
  threadId: string,
) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("owner_id", ownerId)
    .eq("project_id", projectId)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error instanceof Error
      ? error
      : new Error(`Unable to load ${table} for agent timeline.`);
  }

  return data ?? [];
}

export async function loadRuntimeV4TimelineEntries(input: LoadRuntimeV4TimelineInput) {
  const [
    messages,
    toolCalls,
    patches,
    patchOperations,
    artifacts,
    runSummaries,
  ] = await Promise.all([
    input.messages
      ? Promise.resolve(input.messages as PersistedRow[])
      : selectTimelineRows(input.supabase, "agent_messages", input.ownerId, input.projectId, input.threadId),
    input.toolCalls
      ? Promise.resolve(input.toolCalls as PersistedRow[])
      : selectTimelineRows(input.supabase, "agent_tool_calls", input.ownerId, input.projectId, input.threadId),
    selectTimelineRows(input.supabase, "agent_project_patches", input.ownerId, input.projectId, input.threadId),
    selectTimelineRows(input.supabase, "agent_project_patch_operations", input.ownerId, input.projectId, input.threadId),
    selectTimelineRows(input.supabase, "project_artifacts", input.ownerId, input.projectId, input.threadId),
    selectTimelineRows(input.supabase, "agent_run_summaries", input.ownerId, input.projectId, input.threadId),
  ]);

  return buildRuntimeV4TimelineEntries({
    messages,
    toolCalls,
    patches,
    patchOperations,
    artifacts,
    runSummaries,
  });
}
