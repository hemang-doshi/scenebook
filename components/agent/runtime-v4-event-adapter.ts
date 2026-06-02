import type { AgentTimelineEntry } from "@/components/agent/types";
import {
  humanize,
  normalizeArtifactEntry,
  normalizeMemoryEntry,
  normalizePatchEntry,
  normalizeToolEntry,
  normalizeWorkflowEntry,
  recordValue,
  stringValue,
} from "@/components/agent/timeline-normalizers";

export type RuntimeV4ActivityState = {
  label: string;
  tone?: "default" | "error" | "warning";
};

export function runtimeV4EventFromPacket(packet: Record<string, unknown>) {
  return recordValue(packet.event) ?? recordValue(packet.payload) ?? packet;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function observationFromLegacyPacket(packet: Record<string, unknown>) {
  const observation = recordValue(packet.observation);
  if (observation) {
    return observation;
  }

  const output = legacyToolOutput(packet);
  return output ? { output } : null;
}

function legacyToolOutput(packet: Record<string, unknown>) {
  const type = stringValue(packet.type);
  const output = recordValue(packet.output);
  if (output) {
    return output;
  }

  if (type === "approval_required") {
    return {
      kind: "approval_request",
      risk: packet.risk,
      reason: packet.reason,
      preview: packet.preview,
    };
  }

  if (type === "tool_failed") {
    return {
      kind: "tool_error",
      message: packet.error,
    };
  }

  if (type === "tool_planned" || type === "tool_running") {
    return {
      kind: "tool_progress",
      activity: type === "tool_planned" ? "planned" : "running",
    };
  }

  return null;
}

export function runtimeV4EventFromLegacyPacket(packet: Record<string, unknown>): Record<string, unknown> | null {
  const type = stringValue(packet.type);
  if (!type || !["tool_planned", "tool_running", "tool_completed", "tool_failed", "approval_required"].includes(type)) {
    return null;
  }

  const workflowName = stringValue(packet.workflowName) ?? stringValue(packet.workflow_name);
  const patch = recordValue(packet.patch);
  const operationIndex = numberValue(packet.operationIndex) ?? numberValue(packet.operation_index);
  const base = {
    runId: packet.runId,
    threadId: packet.threadId,
    toolName: packet.toolName,
    displayName: packet.displayName,
    toolCallId: packet.toolCallId,
    command: packet.command,
    workflowName,
    observation: observationFromLegacyPacket(packet),
    patch,
    patchStatus: packet.patchStatus ?? packet.patch_status,
    operationIndex,
    operationType: packet.operationType ?? packet.operation_type,
    operationStatus: packet.operationStatus ?? packet.operation_status,
    message: packet.message,
    error: packet.error,
  };

  if (workflowName && type === "tool_planned" && patch) {
    return { ...base, type: "workflow_patch_planned" };
  }

  if (workflowName && type === "tool_running") {
    return { ...base, type: "workflow_started" };
  }

  if (workflowName && type === "tool_completed") {
    return { ...base, type: "workflow_completed" };
  }

  if (workflowName && type === "tool_failed") {
    return { ...base, type: "workflow_failed" };
  }

  if (workflowName && type === "approval_required") {
    return { ...base, type: "workflow_needs_input" };
  }

  if (!patch) {
    if (type === "tool_planned") return { ...base, type: "tool_running" };
    return { ...base, type };
  }

  if (operationIndex !== null) {
    if (type === "tool_running") return { ...base, type: "patch_operation_running" };
    if (type === "tool_completed") return { ...base, type: "patch_operation_completed" };
    if (type === "tool_failed") return { ...base, type: "patch_operation_failed" };
    if (type === "approval_required") return { ...base, type: "patch_operation_awaiting_approval" };
  }

  if (type === "tool_planned") return { ...base, type: "patch_planned" };
  if (type === "tool_running") return { ...base, type: "patch_applying" };
  if (type === "tool_completed") return { ...base, type: "patch_completed" };
  if (type === "tool_failed") return { ...base, type: "patch_failed" };
  if (type === "approval_required") return { ...base, type: "patch_approval_required" };

  return null;
}

function workflowEntryId(event: Record<string, unknown>, workflowName: string) {
  return `workflow-${stringValue(event.runId) ?? stringValue(event.run_id) ?? stringValue(event.threadId) ?? "run"}-${workflowName}`;
}

function patchStatusForEvent(type: string) {
  if (type === "patch_applying") return "applying";
  if (type === "patch_completed") return "completed";
  if (type === "patch_partial_failed") return "partial_failed";
  if (type === "patch_failed") return "failed";
  if (type === "patch_approval_required") return "awaiting_approval";
  return "planned";
}

function patchOperationStatusForEvent(type: string) {
  if (type === "patch_operation_running") return "running";
  if (type === "patch_operation_completed") return "completed";
  if (type === "patch_operation_failed") return "failed";
  if (type === "patch_operation_awaiting_approval") return "awaiting_approval";
  return null;
}

export function timelineEntriesFromRuntimeV4Event(event: Record<string, unknown>): AgentTimelineEntry[] {
  const type = stringValue(event.type);
  const createdAt = new Date().toISOString();
  if (!type) {
    return [];
  }

  if (type === "workflow_started") {
    const workflowName = stringValue(event.workflowName) ?? stringValue(event.workflow_name) ?? stringValue(event.toolName) ?? "creative_workflow";
    return [
      normalizeWorkflowEntry({
        id: workflowEntryId(event, workflowName),
        kind: "workflow",
        workflowName,
        status: "running",
        summary: stringValue(event.message) ?? `Running ${humanize(workflowName)}.`,
        createdAt,
      }),
    ];
  }

  if (type === "workflow_completed" || type === "workflow_failed" || type === "workflow_needs_input") {
    const observation = recordValue(event.observation);
    const workflowName = stringValue(event.workflowName) ?? stringValue(event.workflow_name) ?? stringValue(event.toolName) ?? "creative_workflow";
    const workflow = normalizeWorkflowEntry({
      id: workflowEntryId(event, workflowName),
      kind: "workflow",
      workflowName,
      status:
        type === "workflow_completed"
          ? "completed"
          : type === "workflow_needs_input"
            ? "needs_input"
            : "failed",
      summary: stringValue(event.message) ?? stringValue(event.error) ?? stringValue(observation?.message) ?? humanize(type),
      observation,
      createdAt,
    });
    const entries: AgentTimelineEntry[] = [workflow];

    if (workflow.patch?.patchId) {
      entries.push(normalizePatchEntry({
        id: workflow.patch.patchId,
        kind: "patch",
        patchId: workflow.patch.patchId,
        title: workflow.patch.title ?? "Project patch",
        summary: workflow.patch.summary ?? workflow.summary,
        status: workflow.patch.status ?? "planned",
        autoApplySkippedReason: workflow.patch.autoApplySkippedReason ?? undefined,
        operations: [],
        createdAt,
      }));
    }

    return entries;
  }

  if (type === "workflow_patch_planned" || type.startsWith("patch_")) {
    const patch = recordValue(event.patch);
    if (!patch) {
      return [];
    }
    const persistedPatchId = stringValue(patch.id) ?? stringValue(event.patchId) ?? stringValue(event.patch_id);
    if (type === "workflow_patch_planned" && !persistedPatchId) {
      return [];
    }
    const patchEntry = normalizePatchEntry({
      id: persistedPatchId ?? undefined,
      kind: "patch",
      patch,
      status: stringValue(event.patchStatus) ?? stringValue(event.patch_status) ?? patchStatusForEvent(type),
      message: stringValue(event.message) ?? stringValue(event.error),
      createdAt,
    });
    const operationStatus = patchOperationStatusForEvent(type);
    const operationIndex = typeof event.operationIndex === "number"
      ? event.operationIndex
      : typeof event.operation_index === "number"
        ? event.operation_index
        : null;

    if (operationStatus && operationIndex !== null) {
      const currentOperation = patchEntry.operations.find((operation) => operation.operationIndex === operationIndex);
      patchEntry.operations = [
        {
          operationIndex,
          type:
            currentOperation?.type
            ?? stringValue(event.operationType)
            ?? stringValue(event.operation_type)
            ?? "operation",
          reason: currentOperation?.reason,
          retryable: currentOperation?.retryable,
          status: operationStatus,
          message: stringValue(event.message) ?? currentOperation?.message,
          error: stringValue(event.error) ?? currentOperation?.error,
        },
      ];
    }

    return [patchEntry];
  }

  if (type === "workflow_artifact_created") {
    if (!stringValue(event.artifactId) && !stringValue(event.artifact_id) && !stringValue(event.artifactType) && !stringValue(event.artifact_type) && !recordValue(event.payload)) {
      return [];
    }

    const artifact = normalizeArtifactEntry(
      {
        id: stringValue(event.artifactId) ?? stringValue(event.artifact_id),
        kind: "artifact",
        artifactType: stringValue(event.artifactType) ?? stringValue(event.artifact_type) ?? "agent_artifact",
        title: stringValue(event.message) ?? "Workflow artifact",
        payload: recordValue(event.payload) ?? {},
        createdAt,
      },
      0,
      createdAt,
    );
    return artifact ? [artifact] : [];
  }

  if (type === "memory_updated") {
    return [
      normalizeMemoryEntry({
        id: stringValue(event.id) ?? `memory-${stringValue(event.runId) ?? createdAt}`,
        kind: "memory",
        summary: stringValue(event.message) ?? "Project memory updated.",
        createdAt,
      }),
    ];
  }

  if (type === "tool_completed" || type === "tool_failed" || type === "tool_running" || type === "approval_required") {
    const observation = recordValue(event.observation);
    const output = recordValue(observation?.output) ?? {};
    return [
      normalizeToolEntry({
        id: stringValue(event.toolCallId) ?? stringValue(event.tool_call_id) ?? `${stringValue(event.runId) ?? createdAt}-${stringValue(event.toolName) ?? "tool"}`,
        kind: "tool",
        toolName: stringValue(event.displayName) ?? stringValue(event.toolName) ?? stringValue(observation?.toolName) ?? "Agent Tool",
        command: stringValue(event.command),
        status:
          type === "tool_completed"
            ? "completed"
            : type === "tool_failed"
              ? "failed"
              : type === "approval_required"
                ? "awaiting_approval"
                : "running",
        requiresApproval: type === "approval_required",
        output,
        errorMessage: stringValue(event.error),
        createdAt,
      }),
    ];
  }

  return [];
}

export function activityForRuntimeV4Event(event: Record<string, unknown>): RuntimeV4ActivityState | null {
  const type = stringValue(event.type);
  if (!type) return null;
  if (type === "run_started" || type === "agent_thinking") return { label: "thinking" };
  if (type === "workflow_started") return { label: "working" };
  if (type === "workflow_needs_input" || type === "patch_approval_required" || type === "approval_required") {
    return { label: "approval needed", tone: "warning" };
  }
  if (type === "workflow_failed" || type === "tool_failed" || type === "patch_failed" || type === "run_failed") {
    return { label: "error", tone: "error" };
  }
  if (type === "patch_applying" || type === "patch_operation_running" || type === "tool_running") {
    return { label: "working" };
  }
  if (type === "workflow_patch_planned" || type === "patch_planned") {
    return { label: "draft ready", tone: "warning" };
  }
  if (type === "run_completed" || type === "workflow_completed" || type === "patch_completed" || type === "tool_completed") {
    return { label: "done" };
  }
  return null;
}
