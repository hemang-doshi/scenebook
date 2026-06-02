import type {
  AgentTimelineEntry,
  AgentUiMessage,
  AgentUiToolCall,
  ArtifactTimelineEntry,
  MemoryTimelineEntry,
  PatchOperationTimelineEntry,
  PatchTimelineEntry,
  WorkflowTimelineEntry,
} from "@/components/agent/types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export function recordValue(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function nonEmptyRecordValue(value: unknown): Record<string, unknown> | null {
  return isRecord(value) && Object.keys(value).length > 0 ? value : null;
}

export function createdAtFrom(entry: Record<string, unknown>, fallback = new Date().toISOString()) {
  return stringValue(entry.createdAt) ?? stringValue(entry.created_at) ?? fallback;
}

function entryKind(entry: Record<string, unknown>) {
  const candidate = stringValue(entry.kind) ?? stringValue(entry.entryType) ?? stringValue(entry.type);
  return ["message", "tool", "workflow", "patch", "artifact", "memory"].includes(candidate ?? "")
    ? candidate
    : null;
}

export function normalizeTimelineEntry(value: unknown): AgentTimelineEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  const kind = entryKind(value);
  if (kind === "message" || (!kind && stringValue(value.role) && stringValue(value.content))) {
    return normalizeMessageEntry(value);
  }
  if (kind === "tool" || (!kind && (stringValue(value.tool_name) || stringValue(value.toolName)))) {
    return normalizeToolEntry(value);
  }
  if (kind === "workflow" || (!kind && (stringValue(value.workflow_name) || stringValue(value.workflowName)))) {
    return normalizeWorkflowEntry(value);
  }
  if (kind === "patch" || (!kind && (recordValue(value.patch) || stringValue(value.patchId) || stringValue(value.patch_id)))) {
    return normalizePatchEntry(value);
  }
  if (kind === "artifact" || (!kind && (stringValue(value.artifactType) || stringValue(value.artifact_type)))) {
    return normalizeArtifactEntry(value, 0, createdAtFrom(value));
  }
  if (kind === "memory") {
    return normalizeMemoryEntry(value);
  }

  return null;
}

export function normalizeMessageEntry(entry: Record<string, unknown>): AgentUiMessage {
  const role = stringValue(entry.role);
  return {
    id: stringValue(entry.id) ?? `message-${crypto.randomUUID()}`,
    kind: "message",
    role: role === "user" || role === "system" ? role : "assistant",
    content: stringValue(entry.content) ?? stringValue(entry.message) ?? "",
    createdAt: createdAtFrom(entry),
    metadata: recordValue(entry.metadata) ?? undefined,
  };
}

export function normalizeToolEntry(entry: Record<string, unknown>): AgentUiToolCall {
  return {
    id: stringValue(entry.id) ?? stringValue(entry.toolCallId) ?? stringValue(entry.tool_call_id) ?? `tool-${crypto.randomUUID()}`,
    kind: "tool",
    toolName: stringValue(entry.toolName) ?? stringValue(entry.tool_name) ?? stringValue(entry.displayName) ?? "Agent Tool",
    command: stringValue(entry.command),
    status: stringValue(entry.status) ?? "completed",
    requiresApproval: booleanValue(entry.requiresApproval, booleanValue(entry.requires_approval)),
    output: entry.output ?? entry.payload ?? {},
    errorMessage: stringValue(entry.errorMessage) ?? stringValue(entry.error_message),
    createdAt: createdAtFrom(entry),
    metadata: recordValue(entry.metadata) ?? undefined,
  };
}

export function normalizeArtifactEntry(value: unknown, index = 0, createdAt = new Date().toISOString()): ArtifactTimelineEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  const payload = recordValue(value.payload) ?? recordValue(value.output) ?? {};
  const artifactType =
    stringValue(value.artifactType)
    ?? stringValue(value.artifact_type)
    ?? stringValue(value.type)
    ?? stringValue(payload.kind)
    ?? "agent_artifact";
  const title = stringValue(value.title) ?? humanize(artifactType);

  return {
    id: stringValue(value.id) ?? `artifact-${artifactType}-${index}`,
    kind: "artifact",
    artifactType,
    title,
    summary: stringValue(value.summary) ?? stringValue(value.message),
    payload,
    createdAt: createdAtFrom(value, createdAt),
    metadata: recordValue(value.metadata) ?? undefined,
  };
}

export function normalizeWorkflowEntry(entry: Record<string, unknown>): WorkflowTimelineEntry {
  const observation = recordValue(entry.observation);
  const output = recordValue(observation?.output) ?? recordValue(entry.output) ?? {};
  const workflowName = stringValue(entry.workflowName) ?? stringValue(entry.workflow_name) ?? stringValue(output.workflowName) ?? "creative_workflow";
  const artifactsSource = Array.isArray(entry.artifacts)
    ? entry.artifacts
    : Array.isArray(output.artifacts)
      ? output.artifacts
      : [];
  const createdAt = createdAtFrom(entry);
  const artifacts = artifactsSource
    .map((artifact, index) => normalizeArtifactEntry(artifact, index, createdAt))
    .filter((artifact): artifact is ArtifactTimelineEntry => Boolean(artifact));
  const patch = workflowPatchState(entry, output);

  return {
    id: stringValue(entry.id) ?? `workflow-${stringValue(entry.runId) ?? stringValue(entry.run_id) ?? workflowName}`,
    kind: "workflow",
    workflowName,
    displayName: stringValue(entry.displayName) ?? stringValue(entry.display_name),
    status: stringValue(entry.status) ?? stringValue(observation?.status) ?? "completed",
    summary: stringValue(entry.summary) ?? stringValue(entry.message) ?? stringValue(observation?.message) ?? "Workflow completed.",
    artifacts,
    patch,
    nextAction:
      stringValue(entry.nextAction)
      ?? stringValue(entry.next_action)
      ?? stringValue(output.nextBestAction)
      ?? stringValue(output.next_best_action),
    createdAt,
    metadata: recordValue(entry.metadata) ?? undefined,
  };
}

function workflowPatchState(
  entry: Record<string, unknown>,
  output: Record<string, unknown>,
): WorkflowTimelineEntry["patch"] {
  const rawPatch = recordValue(entry.patch);
  const patchId = stringValue(entry.patchId) ?? stringValue(entry.patch_id) ?? stringValue(output.patchId) ?? stringValue(rawPatch?.id);
  const title = stringValue(entry.patchTitle) ?? stringValue(entry.patch_title) ?? stringValue(output.patchTitle) ?? stringValue(rawPatch?.title);
  const summary = stringValue(entry.patchSummary) ?? stringValue(entry.patch_summary) ?? stringValue(output.patchSummary) ?? stringValue(rawPatch?.summary);
  const status = stringValue(entry.patchStatus) ?? stringValue(entry.patch_status) ?? stringValue(output.patchStatus);
  const autoApplySkippedReason =
    stringValue(entry.autoApplySkippedReason)
    ?? stringValue(entry.auto_apply_skipped_reason)
    ?? stringValue(output.patchAutoApplyReason)
    ?? stringValue(output.autoApplyReason);

  if (!patchId && !title && !summary && !status && !rawPatch) {
    return null;
  }

  return {
    patchId,
    title,
    summary,
    status,
    planned: Boolean(patchId || title || status === "planned"),
    applied: status === "completed" || status === "approved",
    autoApplySkippedReason,
  };
}

export function normalizePatchEntry(entry: Record<string, unknown>): PatchTimelineEntry {
  const patch = recordValue(entry.patch) ?? entry;
  const metadata = recordValue(entry.metadata) ?? recordValue(patch.metadata);
  const operationsSource = Array.isArray(entry.operations)
    ? entry.operations
    : Array.isArray(patch.operations)
      ? patch.operations
      : [];
  const persistedPatchId = stringValue(entry.patchId) ?? stringValue(entry.patch_id) ?? stringValue(patch.id) ?? stringValue(entry.id);
  const patchId = persistedPatchId ?? `patch-draft-${stringValue(patch.title) ?? stringValue(entry.title) ?? crypto.randomUUID()}`;
  const status = stringValue(entry.status) ?? stringValue(entry.patchStatus) ?? stringValue(entry.patch_status) ?? "planned";

  return {
    id: stringValue(entry.id) ?? patchId,
    kind: "patch",
    patchId,
    title: stringValue(entry.title) ?? stringValue(patch.title) ?? "Project patch",
    summary: stringValue(entry.summary) ?? stringValue(patch.summary) ?? stringValue(entry.message),
    status,
    riskLevel: stringValue(entry.riskLevel) ?? stringValue(entry.risk_level) ?? stringValue(patch.riskLevel),
    requiresApproval: booleanValue(entry.requiresApproval, booleanValue(entry.requires_approval, booleanValue(patch.requiresApproval))),
    autoApplySkippedReason:
      stringValue(entry.autoApplySkippedReason)
      ?? stringValue(entry.auto_apply_skipped_reason)
      ?? stringValue(metadata?.autoApplyReason)
      ?? stringValue(metadata?.autoApplySkippedReason),
    operations: operationsSource.map(normalizePatchOperation),
    canApply: typeof entry.canApply === "boolean" ? entry.canApply : Boolean(persistedPatchId && ["planned", "awaiting_approval"].includes(status)),
    createdAt: createdAtFrom(entry),
    metadata: metadata ?? undefined,
  };
}

function normalizePatchOperation(value: unknown, index: number): PatchOperationTimelineEntry {
  const operation = isRecord(value) ? value : {};
  const nested = recordValue(operation.operation);
  const error = operation.error;
  return {
    operationIndex:
      typeof operation.operationIndex === "number"
        ? operation.operationIndex
        : typeof operation.operation_index === "number"
          ? operation.operation_index
          : index,
    type: stringValue(operation.type) ?? stringValue(operation.operationType) ?? stringValue(operation.operation_type) ?? stringValue(nested?.type) ?? "operation",
    status: stringValue(operation.status) ?? stringValue(operation.operationStatus) ?? stringValue(operation.operation_status) ?? "planned",
    reason: stringValue(operation.reason) ?? stringValue(nested?.reason),
    message: stringValue(operation.message),
    retryable: typeof operation.retryable === "boolean" ? operation.retryable : undefined,
    error: typeof error === "string" ? error : nonEmptyRecordValue(error),
  };
}

export function normalizeMemoryEntry(entry: Record<string, unknown>): MemoryTimelineEntry {
  return {
    id: stringValue(entry.id) ?? `memory-${crypto.randomUUID()}`,
    kind: "memory",
    title: stringValue(entry.title),
    summary: stringValue(entry.summary) ?? stringValue(entry.message) ?? "Project memory updated.",
    memoryType: stringValue(entry.memoryType) ?? stringValue(entry.memory_type),
    createdAt: createdAtFrom(entry),
    metadata: recordValue(entry.metadata) ?? undefined,
  };
}

export function humanize(value: string) {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Agent item";
}
