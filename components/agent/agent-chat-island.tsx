"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Bot, Library } from "lucide-react";

import { AgentComposer, type Attachment } from "@/components/agent/agent-composer";
import { ApprovalCard } from "@/components/agent/approval-card";
import { ArtifactPreviewCard } from "@/components/agent/artifact-preview-card";
import { AssetDrawer } from "@/components/agent/asset-drawer";
import { ChatMessage } from "@/components/agent/chat-message";
import { EmptyAgentState } from "@/components/agent/empty-agent-state";
import { PatchPreviewCard } from "@/components/agent/patch-preview-card";
import { ToolCallCard } from "@/components/agent/tool-call-card";
import { WorkflowCard } from "@/components/agent/workflow-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgentModelSelection } from "@/components/agent/model-accordion";
import { ProjectMindPanel } from "@/components/agent/project-mind-panel";
import type {
  AgentTimelineEntry,
  AgentUiEntry,
  AgentUiMessage,
  AgentUiToolCall,
  ArtifactTimelineEntry,
  MemoryTimelineEntry,
  PatchOperationTimelineEntry,
  PatchTimelineEntry,
  WorkflowTimelineEntry,
} from "@/components/agent/types";
import { getDefaultChatModel, getDefaultMediaModel } from "@/lib/ai/model-registry";
import type { ProjectWorkspace } from "@/lib/data/repository";
import { fetchJson } from "@/lib/fetcher";
import type { ProjectAssetLibrary } from "@/lib/assets/asset-folders";
import { cn } from "@/lib/utils";

export type { AgentUiMessage, AgentUiToolCall } from "@/components/agent/types";

type AgentHistoryResponse = {
  threadId: string | null;
  entries?: unknown[];
  messages?: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    created_at?: string;
    metadata?: Record<string, unknown>;
  }>;
  toolCalls?: Array<{
    id: string;
    tool_name: string;
    command?: string | null;
    status: string;
    requires_approval: boolean;
    output?: unknown;
    error_message?: string | null;
    created_at?: string;
  }>;
};

type AgentPostResponse = {
  threadId: string;
  message: string;
  tool?: {
    id: string;
    command?: string | null;
    status: string;
    toolName: string;
    requiresApproval: boolean;
    errorMessage?: string | null;
    result: {
      output: unknown;
    };
  };
};

type ActivityState = {
  label: string;
  tone?: "default" | "error" | "warning";
};

const emptyModels: AgentModelSelection = {
  chat: getDefaultChatModel().id,
  image: getDefaultMediaModel("image").id,
  video: getDefaultMediaModel("video").id,
  audio: getDefaultMediaModel("audio").id,
};

function sortEntries(entries: AgentUiEntry[]) {
  return [...entries].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function nonEmptyRecordValue(value: unknown): Record<string, unknown> | null {
  return isRecord(value) && Object.keys(value).length > 0 ? value : null;
}

function createdAtFrom(entry: Record<string, unknown>, fallback = new Date().toISOString()) {
  return stringValue(entry.createdAt) ?? stringValue(entry.created_at) ?? fallback;
}

function entryKind(entry: Record<string, unknown>) {
  const candidate = stringValue(entry.kind) ?? stringValue(entry.entryType) ?? stringValue(entry.type);
  return ["message", "tool", "workflow", "patch", "artifact", "memory"].includes(candidate ?? "")
    ? candidate
    : null;
}

function toAgentEntries(history: AgentHistoryResponse): AgentUiEntry[] {
  const timelineEntries = Array.isArray(history.entries)
    ? history.entries
        .map(normalizeTimelineEntry)
        .filter((entry): entry is AgentTimelineEntry => Boolean(entry))
    : [];

  if (timelineEntries.length > 0) {
    return sortEntries(timelineEntries);
  }

  const messages: AgentUiMessage[] = (history.messages ?? []).map((message) => ({
    id: message.id,
    kind: "message",
    role: message.role,
    content: message.content,
    createdAt: message.created_at ?? new Date().toISOString(),
    metadata: message.metadata,
  }));
  const toolCalls: AgentUiToolCall[] = (history.toolCalls ?? []).map((toolCall) => ({
    id: toolCall.id,
    kind: "tool",
    toolName: toolCall.tool_name,
    command: toolCall.command,
    status: toolCall.status,
    requiresApproval: toolCall.requires_approval,
    output: toolCall.output ?? {},
    errorMessage: toolCall.error_message,
    createdAt: toolCall.created_at ?? new Date().toISOString(),
  }));

  return sortEntries([...messages, ...toolCalls]);
}

function normalizeTimelineEntry(value: unknown): AgentTimelineEntry | null {
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

function normalizeMessageEntry(entry: Record<string, unknown>): AgentUiMessage {
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

function normalizeToolEntry(entry: Record<string, unknown>): AgentUiToolCall {
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

function normalizeArtifactEntry(value: unknown, index = 0, createdAt = new Date().toISOString()): ArtifactTimelineEntry | null {
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

function normalizeWorkflowEntry(entry: Record<string, unknown>): WorkflowTimelineEntry {
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

function normalizePatchEntry(entry: Record<string, unknown>): PatchTimelineEntry {
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

function normalizeMemoryEntry(entry: Record<string, unknown>): MemoryTimelineEntry {
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

function humanize(value: string) {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Agent item";
}

function runtimeV4EventFromPacket(packet: Record<string, unknown>) {
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

  const output = recordValue(packet.output);
  return output ? { output } : null;
}

function runtimeV4EventFromLegacyPacket(packet: Record<string, unknown>): Record<string, unknown> | null {
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
    toolCallId: packet.toolCallId,
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
    return null;
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

function timelineEntriesFromRuntimeV4Event(event: Record<string, unknown>): AgentTimelineEntry[] {
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
    const entries: AgentTimelineEntry[] = [workflow, ...(workflow.artifacts ?? [])];

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
        toolName: stringValue(event.toolName) ?? stringValue(observation?.toolName) ?? "Agent Tool",
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

function activityForRuntimeV4Event(event: Record<string, unknown>): ActivityState | null {
  const type = stringValue(event.type);
  if (!type) return null;
  if (type === "run_started" || type === "agent_thinking") return { label: "thinking" };
  if (type === "workflow_started") return { label: "working" };
  if (type === "workflow_needs_input" || type === "patch_approval_required") {
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
  if (type === "run_completed" || type === "workflow_completed" || type === "patch_completed") {
    return { label: "done" };
  }
  return null;
}

function mergePatchOperations(
  current: PatchOperationTimelineEntry[],
  incoming: PatchOperationTimelineEntry[],
) {
  if (incoming.length === 0) {
    return current;
  }

  const merged = [...current];
  for (const operation of incoming) {
    const index = merged.findIndex((candidate) => candidate.operationIndex === operation.operationIndex);
    if (index >= 0) {
      merged[index] = { ...merged[index], ...operation };
    } else {
      merged.push(operation);
    }
  }
  return merged.sort((left, right) => left.operationIndex - right.operationIndex);
}

function mergeTimelineEntry(current: AgentTimelineEntry, incoming: AgentTimelineEntry): AgentTimelineEntry {
  if (current.kind === "patch" && incoming.kind === "patch") {
    return {
      ...current,
      ...incoming,
      summary: incoming.summary ?? current.summary,
      riskLevel: incoming.riskLevel ?? current.riskLevel,
      autoApplySkippedReason: incoming.autoApplySkippedReason ?? current.autoApplySkippedReason,
      operations: mergePatchOperations(current.operations, incoming.operations),
      metadata: { ...(current.metadata ?? {}), ...(incoming.metadata ?? {}) },
    };
  }

  if (current.kind === "workflow" && incoming.kind === "workflow") {
    return {
      ...current,
      ...incoming,
      artifacts: incoming.artifacts?.length ? incoming.artifacts : current.artifacts,
      patch: incoming.patch ?? current.patch,
      nextAction: incoming.nextAction ?? current.nextAction,
      metadata: { ...(current.metadata ?? {}), ...(incoming.metadata ?? {}) },
    };
  }

  return incoming;
}

function sameTimelineEntry(left: AgentTimelineEntry, right: AgentTimelineEntry) {
  if (left.kind === "patch" && right.kind === "patch") {
    return left.patchId === right.patchId;
  }
  return left.id === right.id;
}

function upsertTimelineEntries(
  current: AgentTimelineEntry[],
  incoming: AgentTimelineEntry[],
) {
  const next = [...current];
  for (const entry of incoming) {
    const index = next.findIndex((candidate) => sameTimelineEntry(candidate, entry));
    if (index >= 0) {
      next[index] = mergeTimelineEntry(next[index], entry);
    } else {
      next.push(entry);
    }
  }
  return sortEntries(next);
}

type ThreadInfo = { id: string; title: string | null; updated_at: string };

export function AgentChatIsland({ project }: { project: ProjectWorkspace }) {
  const [threadId, setThreadId] = useState<string | "new-chat" | null>(null);
  const [threads, setThreads] = useState<ThreadInfo[]>([]);
  const [entries, setEntries] = useState<AgentUiEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [models, setModels] = useState<AgentModelSelection>(emptyModels);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityState>({ label: "done" });

  const [library, setLibrary] = useState<ProjectAssetLibrary | null>(null);
  const [isAssetDrawerOpen, setIsAssetDrawerOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const lastFetchedThreadId = useRef<string | "new-chat" | null>(null);

  const loadThreadsList = useCallback(async () => {
    try {
      const response = await fetchJson<{ threads: ThreadInfo[] }>(`/api/projects/${project.id}/agent?listThreads=true`);
      setThreads(response.threads || []);
    } catch (err) {
      console.warn("Failed to load threads list:", err);
    }
  }, [project.id]);

  const loadAssets = useCallback(async () => {
    try {
      const data = await fetchJson<ProjectAssetLibrary>(`/api/projects/${project.id}/assets`);
      setLibrary(data);
    } catch (err) {
      console.warn("Failed to load assets for summary:", err);
    }
  }, [project.id]);

  // Load threads list and asset library on mount and when project changes
  useEffect(() => {
    Promise.resolve().then(() => {
      void loadThreadsList();
      void loadAssets();
    });
  }, [project.id, loadThreadsList, loadAssets]);

  async function submitMessage() {
    const message = draft.trim();

    if (!message) {
      return;
    }

    const createdAt = new Date().toISOString();
    const localUserMessage: AgentUiMessage = {
      id: `local-user-${createdAt}`,
      kind: "message",
      role: "user",
      content: message,
      createdAt,
      metadata: attachments.length > 0 ? { attachments } : undefined,
    };

    setEntries((current) => sortEntries([...current, localUserMessage]));
    const currentAttachments = [...attachments];
    setDraft("");
    setAttachments([]);
    setIsSending(true);
    setError(null);
    setActivity(getActivityForDraft(message));

    try {
      const response = await fetch(`/api/projects/${project.id}/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId: threadId === "new-chat" ? undefined : (threadId ?? undefined),
          message,
          models,
          attachments: currentAttachments,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Request failed.");
      }

      const contentType = response.headers.get("Content-Type") || "";
      if (contentType.includes("text/event-stream")) {
        const placeholderId = `stream-assistant-${createdAt}`;
        const placeholderMessage: AgentUiMessage = {
          id: placeholderId,
          kind: "message",
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
        };
        setEntries((current) => sortEntries([...current, placeholderMessage]));

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No readable stream in response.");
        }
        const decoder = new TextDecoder();
        let buffer = "";
        let sawToolEvent = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) {
              continue;
            }
            const rawData = trimmed.slice(6);
            try {
              const data = JSON.parse(rawData);
              if (data.type === "meta") {
                if (data.threadId) {
                  setThreadId(data.threadId);
                  lastFetchedThreadId.current = data.threadId;
                  void loadThreadsList();
                }
              } else if (data.type === "run_started") {
                if (data.threadId) {
                  setThreadId(data.threadId);
                  lastFetchedThreadId.current = data.threadId;
                  void loadThreadsList();
                }
                setActivity({ label: "thinking" });
              } else if (data.type === "v4_event") {
                const event = runtimeV4EventFromPacket(data);
                const eventType = stringValue(event.type);
                const eventThreadId = stringValue(event.threadId) ?? stringValue(event.thread_id);
                if (eventThreadId) {
                  setThreadId(eventThreadId);
                  lastFetchedThreadId.current = eventThreadId;
                  void loadThreadsList();
                }

                const eventActivity = activityForRuntimeV4Event(event);
                if (eventActivity) {
                  setActivity(eventActivity);
                }

                if (eventType === "final_response") {
                  const responseText = stringValue(event.response) ?? stringValue(event.message);
                  if (responseText) {
                    setEntries((current) =>
                      current.map((entry) =>
                        entry.id === placeholderId && entry.kind === "message"
                          ? { ...entry, content: entry.content + responseText }
                          : entry
                      )
                    );
                  }
                }

                if (eventType === "run_failed") {
                  const eventError = stringValue(event.error) ?? stringValue(event.message);
                  if (eventError) {
                    setError(eventError);
                  }
                }

                if (eventType === "run_completed") {
                  setHistoryVersion((version) => version + 1);
                }

                const timelineEntries = timelineEntriesFromRuntimeV4Event(event);
                if (timelineEntries.length > 0) {
                  if (timelineEntries.some((entry) => entry.kind === "tool")) {
                    sawToolEvent = true;
                  }
                  setEntries((current) => upsertTimelineEntries(current, timelineEntries));
                }
              } else if (data.type === "chunk" && data.text) {
                setActivity({ label: "thinking" });
                setEntries((current) =>
                  current.map((entry) =>
                    entry.id === placeholderId && entry.kind === "message"
                      ? { ...entry, content: entry.content + data.text }
                      : entry
                  )
                );
              } else if (data.type === "message_delta" && data.text) {
                setActivity({ label: "thinking" });
                setEntries((current) =>
                  current.map((entry) =>
                    entry.id === placeholderId && entry.kind === "message"
                      ? { ...entry, content: entry.content + data.text }
                      : entry
                  )
                );
              } else if (data.type === "tool" && data.tool) {
                const tool = data.tool as AgentPostResponse["tool"];
                sawToolEvent = true;
                if (tool) {
                  if (tool.status === "awaiting_input") {
                    setActivity({ label: "awaiting input", tone: "warning" });
                  } else if (tool.status === "awaiting_approval") {
                    setActivity({ label: "draft ready", tone: "warning" });
                  } else if (tool.status === "running") {
                    const output = tool.result?.output as Record<string, unknown> | undefined;
                    setActivity({
                      label: typeof output?.activity === "string" ? output.activity : "working",
                    });
                  } else if (
                    tool.status === "failed" &&
                    tool.result?.output &&
                    (tool.result.output as Record<string, unknown>).kind === "media_error"
                  ) {
                    setActivity({ label: "generation failed", tone: "error" });
                  } else {
                    setActivity({ label: "done" });
                  }

                  setEntries((current) =>
                    sortEntries([
                      ...current.filter((entry) => entry.kind !== "tool" || entry.id !== tool.id),
                      {
                        id: tool.id,
                        kind: "tool",
                        toolName: tool.toolName,
                        command: tool.command,
                        status: tool.status,
                        requiresApproval: tool.requiresApproval,
                        output: tool.result?.output ?? tool.result ?? {},
                        errorMessage: "errorMessage" in tool ? (tool as { errorMessage?: string | null }).errorMessage : null,
                        createdAt: new Date().toISOString(),
                      },
                    ])
                  );
                }
              } else if (
                data.type === "tool_planned" ||
                data.type === "tool_running" ||
                data.type === "tool_completed" ||
                data.type === "tool_failed" ||
                data.type === "approval_required"
              ) {
                const toolCallId =
                  typeof data.toolCallId === "string"
                    ? data.toolCallId
                    : [
                        "runtime-v3-tool",
                        stringValue(data.runId) ?? stringValue(data.threadId) ?? createdAt,
                        stringValue(data.toolName) ?? stringValue(data.displayName) ?? data.type,
                      ].join("-");
                const status =
                  data.type === "tool_completed"
                    ? "completed"
                    : data.type === "tool_failed"
                      ? "failed"
                      : data.type === "approval_required"
                        ? "awaiting_approval"
                        : "running";
                const output =
                  data.type === "approval_required"
                    ? {
                        kind: "approval_request",
                        risk: data.risk,
                        reason: data.reason,
                        preview: data.preview,
                      }
                    : data.type === "tool_failed"
                      ? { kind: "tool_error", message: data.error }
                      : typeof data.output === "object" && data.output !== null
                        ? data.output
                        : { kind: "tool_progress", activity: status };
                const richEvent = runtimeV4EventFromLegacyPacket(data);
                const richEntries = richEvent ? timelineEntriesFromRuntimeV4Event(richEvent) : [];

                sawToolEvent = true;
                const richActivity = richEvent ? activityForRuntimeV4Event(richEvent) : null;
                if (richActivity) {
                  setActivity(richActivity);
                } else {
                  setActivity(
                    status === "failed"
                      ? { label: "tool failed", tone: "error" }
                      : status === "awaiting_approval"
                        ? { label: "approval needed", tone: "warning" }
                        : status === "completed"
                          ? { label: "done" }
                          : { label: "working" },
                  );
                }

                if (richEntries.length > 0) {
                  setEntries((current) => upsertTimelineEntries(current, richEntries));
                } else {
                  setEntries((current) =>
                    sortEntries([
                      ...current.filter((entry) => entry.kind !== "tool" || entry.id !== toolCallId),
                      {
                        id: toolCallId,
                        kind: "tool",
                        toolName: typeof data.displayName === "string" ? data.displayName : String(data.toolName ?? "Agent Tool"),
                        command: null,
                        status,
                        requiresApproval: status === "awaiting_approval",
                        output,
                        errorMessage: typeof data.error === "string" ? data.error : null,
                        createdAt: new Date().toISOString(),
                      },
                    ])
                  );
                }
              } else if (data.type === "run_completed") {
                setActivity({ label: "done" });
                setHistoryVersion((version) => version + 1);
              } else if (data.type === "run_failed") {
                setActivity({ label: "error", tone: "error" });
                if (typeof data.error === "string") {
                  setError(data.error);
                }
              }
            } catch (err) {
              console.warn("Failed to parse stream packet:", rawData, err);
            }
          }
        }
        if (!sawToolEvent) {
          setActivity({ label: "done" });
        }
      } else {
        const data = (await response.json()) as AgentPostResponse;
        setThreadId(data.threadId);
        lastFetchedThreadId.current = data.threadId;
        void loadThreadsList();
        if (data.tool?.status === "awaiting_input") {
          setActivity({ label: "awaiting input", tone: "warning" });
        } else if (data.tool?.status === "awaiting_approval") {
          setActivity({ label: "draft ready", tone: "warning" });
        } else if (
          data.tool?.status === "failed" &&
          data.tool.result?.output &&
          (data.tool.result.output as Record<string, unknown>).kind === "media_error"
        ) {
          setActivity({ label: "generation failed", tone: "error" });
        } else if (
          data.tool?.result?.output &&
          (data.tool.result.output as Record<string, unknown>).kind === "media_asset"
        ) {
          setActivity({ label: "saving asset" });
          await loadAssets();
          setActivity({ label: "done" });
        } else {
          setActivity({ label: "done" });
        }

        setEntries((current) => {
          const nextEntries = [...current];

          if (data.message) {
            nextEntries.push({
              id: `assistant-${data.threadId}-${Date.now()}`,
              kind: "message",
              role: "assistant",
              content: data.message,
              createdAt: new Date().toISOString(),
            });
          }

          if (data.tool) {
            nextEntries.push({
              id: data.tool.id,
              kind: "tool",
              toolName: data.tool.toolName,
              command: data.tool.command,
              status: data.tool.status,
              requiresApproval: data.tool.requiresApproval,
              output: data.tool.result?.output ?? data.tool.result ?? {},
              errorMessage: "errorMessage" in data.tool ? (data.tool as { errorMessage?: string | null }).errorMessage : null,
              createdAt: new Date().toISOString(),
            });
          }

          return sortEntries(nextEntries);
        });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send message.");
      setActivity({ label: "error", tone: "error" });
    } finally {
      setIsSending(false);
    }
  }

  const [historyVersion, setHistoryVersion] = useState(0);
  const lastFetchedVersion = useRef(0);

  // Load history whenever the selected threadId or historyVersion changes
  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      if (threadId === "new-chat") {
        setEntries([]);
        setIsLoadingHistory(false);
        lastFetchedThreadId.current = "new-chat";
        lastFetchedVersion.current = historyVersion;
        setActivity({ label: "done" });
        return;
      }

      if (
        threadId !== null &&
        threadId === lastFetchedThreadId.current &&
        historyVersion === lastFetchedVersion.current
      ) {
        return;
      }

      setIsLoadingHistory(true);
      setError(null);

      try {
        const url = threadId
          ? `/api/projects/${project.id}/agent?threadId=${threadId}`
          : `/api/projects/${project.id}/agent`;
        const history = await fetchJson<AgentHistoryResponse>(url);

        if (cancelled) {
          return;
        }

        const fetchedId = history.threadId;
        lastFetchedThreadId.current = fetchedId;
        lastFetchedVersion.current = historyVersion;

        if (threadId === null) {
          setThreadId(fetchedId || "new-chat");
        }

        const loadedEntries = toAgentEntries(history);
        setEntries(loadedEntries);
        const pendingTool = [...(history.toolCalls ?? [])].reverse().find((toolCall) => toolCall.status === "awaiting_input");
        setActivity(pendingTool ? { label: "awaiting input", tone: "warning" } : { label: "done" });
      } catch (caught) {
        if (!cancelled) {
          setEntries([]);
          setError(caught instanceof Error ? caught.message : "Unable to load agent history.");
          setActivity({ label: "error", tone: "error" });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [project.id, threadId, historyVersion, project]);

  const hasMessages = entries.length > 0;
  const editorHref = `/editor/${project.id}`;
  const totalAssets = (library?.folders.reduce((acc, f) => acc + f.assets.length, 0) || 0) + (library?.looseAssets.length || 0);

  return (
    <div className="flex h-[calc(100vh-3.5rem-36px)] w-full overflow-hidden bg-[var(--canvas)]">
      
      {/* Left Sidebar for History */}
      <div className="hidden h-full w-64 shrink-0 flex-col border-r border-[var(--hairline)] bg-[var(--surface-soft)]/60 p-4 md:flex">
        <div className="flex flex-col flex-1 min-h-0">
          <Button
            variant="secondary"
            onClick={() => {
              setThreadId("new-chat");
              setEntries([]);
            }}
            className={cn(
              "w-full text-xs font-mono uppercase tracking-wider h-9 bg-[var(--canvas)] border-[var(--hairline)] hover:border-[var(--ink)] mb-4 shrink-0",
              threadId !== "new-chat" && "text-muted"
            )}
          >
            + New Conversation
          </Button>

          <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--muted)] px-1 font-bold block mb-2 shrink-0">Recent Conversations</span>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setThreadId(t.id)}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs rounded-md transition-colors truncate font-mono uppercase tracking-wider flex items-center justify-between border",
                  threadId === t.id
                    ? "bg-[var(--canvas)] text-[var(--ink)] font-bold border-[var(--hairline)]"
                    : "text-[var(--ink)]/65 bg-transparent hover:bg-[var(--canvas)] hover:text-[var(--ink)] border-transparent"
                )}
              >
                <span className="truncate">{t.title || `Thread ${t.id.slice(0, 8)}`}</span>
              </button>
            ))}
            {threads.length === 0 && (
              <div className="text-center py-8 text-[10px] text-[var(--muted)] font-mono">
                No chat history yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Main Conversational Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* Navigation Bar */}
        <header className="h-14 border-b border-[var(--hairline)] px-3 sm:px-6 flex items-center justify-between bg-[var(--canvas)] shrink-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-3 min-w-0">
            <Bot className="h-4 w-full max-w-4 text-[var(--primary)] shrink-0" />
            <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-[var(--ink)] truncate">
              {project.title} &bull; Strategic Agent
            </h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href={editorHref}>
              <Button variant="secondary" className="h-8 px-3 text-[10px] font-mono">
                Editor
              </Button>
            </Link>
            <Link href={`/projects/${project.id}`}>
              <Button variant="secondary" className="hidden h-8 px-3 text-[10px] font-mono sm:inline-flex">
                Project Hub
              </Button>
            </Link>
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAssetDrawerOpen((current) => !current)}
                className="h-8 px-3 text-[10px] font-mono bg-[var(--surface-soft)] border border-[var(--hairline)] hover:border-[var(--ink)] flex items-center gap-1.5"
              >
                <Library className="h-3.5 w-3.5 text-[var(--ink)]/70" />
                <span>Assets:</span>
                <span className="rounded-md bg-[var(--canvas)] px-1.5 py-0.5 border border-[var(--hairline)] font-bold font-mono">{library ? totalAssets : "—"}</span>
              </Button>
              <AssetDrawer projectId={project.id} open={isAssetDrawerOpen} onOpenChange={setIsAssetDrawerOpen} />
            </div>
          </div>
        </header>

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin flex flex-col sm:px-6 sm:py-6">
          <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col justify-between">
            <div className="w-full flex-1">
              
              {error ? <p className="pb-3 text-xs text-[var(--danger)]">{error}</p> : null}
              
              <div className="mb-4 flex w-full justify-start">
                <Badge className={cn(
                  "border text-[9px] px-2 py-0.5 rounded-[var(--rounded-sm)]",
                  activity.tone === "error"
                    ? "border-[var(--danger)]/30 bg-red-50 text-[var(--danger)]"
                    : activity.tone === "warning"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-800"
                      : "border-[var(--hairline)] bg-[var(--surface-soft)] text-[var(--ink)]"
                )}>
                  {activity.label.toUpperCase()}
                </Badge>
              </div>

              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--ink)] border-t-transparent" />
                </div>
              ) : !hasMessages ? (
                <EmptyAgentState />
              ) : (
                <div className="space-y-6 pb-40">
                  {entries.map((entry, index) => {
                    if (entry.kind === "message") {
                      return <ChatMessage key={entry.id} message={entry} index={index} />;
                    }

                    if (entry.kind === "workflow") {
                      return (
                        <div key={entry.id} className="flex justify-start">
                          <div className="w-full">
                            <WorkflowCard entry={entry} />
                          </div>
                        </div>
                      );
                    }

                    if (entry.kind === "patch") {
                      return (
                        <div key={entry.id} className="flex justify-start">
                          <div className="w-full">
                            <PatchPreviewCard
                              entry={entry}
                              projectId={project.id}
                              onRefresh={() => setHistoryVersion((v) => v + 1)}
                            />
                          </div>
                        </div>
                      );
                    }

                    if (entry.kind === "artifact") {
                      return (
                        <div key={entry.id} className="flex justify-start">
                          <div className="w-full">
                            <ArtifactPreviewCard entry={entry} />
                          </div>
                        </div>
                      );
                    }

                    if (entry.kind === "memory") {
                      return (
                        <div key={entry.id} className="flex justify-start">
                          <div className="w-full">
                            <MemoryTimelineCard entry={entry} />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={entry.id} className="flex justify-start">
                        <div className="w-full">
                          {entry.requiresApproval ? (
                            <ApprovalCard
                              toolCall={entry}
                              projectId={project.id}
                              onRefresh={() => setHistoryVersion((v) => v + 1)}
                            />
                          ) : (
                            <ToolCallCard toolCall={entry} onQuickCommand={setDraft} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Composer bottom sticky aligned */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[var(--canvas)] via-[var(--canvas)]/95 to-transparent pointer-events-none z-20 sm:p-6">
          <div className="max-w-3xl mx-auto w-full pointer-events-auto">
            <AgentComposer
              value={draft}
              onChange={setDraft}
              onSubmit={() => void submitMessage()}
              isSending={isSending}
              models={models}
              onModelsChange={setModels}
              onQuickCommand={(command) => setDraft(`${command} `)}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />
          </div>
        </div>
      </div>

      <ProjectMindPanel project={project} />
    </div>
  );
}

function MemoryTimelineCard({ entry }: { entry: MemoryTimelineEntry }) {
  return (
    <div className="grid gap-1 rounded-[var(--rounded-lg)] border border-[var(--hairline)] bg-[var(--canvas)] p-4 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] font-mono uppercase tracking-widest text-[var(--ink)]/55">
          {entry.memoryType ? humanize(entry.memoryType) : "Memory"}
        </p>
        <Badge className="border border-[var(--hairline)] bg-[var(--surface-soft)] text-[10px] text-[var(--ink)]/75">
          saved
        </Badge>
      </div>
      {entry.title ? <p className="text-sm font-semibold text-[var(--ink)]">{entry.title}</p> : null}
      <p className="text-xs leading-relaxed text-[var(--ink)]/85">{entry.summary}</p>
    </div>
  );
}

function getActivityForDraft(message: string): ActivityState {
  if (!message.startsWith("/")) {
    return { label: "thinking" };
  }

  const command = message.split(/\s+/)[0];
  if (command === "/generate-image") return { label: "generating image" };
  if (command === "/generate-video") return { label: "generating video" };
  if (command === "/generate-audio") return { label: "generating audio" };
  return { label: `running ${command}` };
}
