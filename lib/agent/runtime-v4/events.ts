import type { AgentEventType } from "@/lib/agent/runtime-v3/types";
import type { AgentDecision } from "@/lib/agent/runtime-v4/decision/schemas";
import type { AgentPlan, ToolObservation } from "@/lib/agent/runtime-v3/types";
import type { ProjectPatch } from "@/lib/agent/runtime-v4/patch/project-patch";

export type RuntimeV4EventType =
  | "run_started"
  | "agent_thinking"
  | "decision_made"
  | "workflow_started"
  | "workflow_completed"
  | "workflow_failed"
  | "workflow_needs_input"
  | "workflow_patch_planned"
  | "workflow_artifact_created"
  | "tool_planned"
  | "tool_running"
  | "tool_completed"
  | "tool_failed"
  | "tool_verification_completed"
  | "tool_verification_failed"
  | "approval_required"
  | "patch_planned"
  | "patch_applying"
  | "patch_operation_running"
  | "patch_operation_completed"
  | "patch_operation_failed"
  | "patch_operation_awaiting_approval"
  | "patch_completed"
  | "patch_partial_failed"
  | "patch_failed"
  | "patch_approval_required"
  | "memory_updated"
  | "final_response"
  | "run_completed";

export type RuntimeV4Event = {
  type: RuntimeV4EventType;
  runId?: string;
  threadId?: string | null;
  message?: string;
  decision?: AgentDecision;
  plan?: AgentPlan;
  toolName?: string;
  toolCallId?: string;
  workflowName?: string;
  observation?: ToolObservation;
  patch?: ProjectPatch;
  patchStatus?: string;
  operationIndex?: number;
  operationType?: string;
  operationStatus?: string;
  verification?: unknown;
  response?: string;
  waitingForUser?: boolean;
  snapshot?: unknown;
  error?: string;
};

export type LegacyAgentEvent = {
  type: AgentEventType;
  payload: Record<string, unknown>;
};

export function mapRuntimeV4EventToLegacy(event: RuntimeV4Event): LegacyAgentEvent[] {
  switch (event.type) {
    case "run_started":
      return [{
        type: "run_started",
        payload: {
          threadId: event.threadId ?? null,
          runId: event.runId ?? null,
        },
      }];
    case "agent_thinking":
      return [{
        type: "snapshot_loaded",
        payload: {
          snapshot: event.snapshot ?? null,
          message: event.message ?? null,
        },
      }];
    case "decision_made": {
      const events: LegacyAgentEvent[] = [{
        type: "decision",
        payload: {
          decision: event.decision ?? null,
        },
      }];
      if (event.decision?.type === "propose_plan") {
        events.push({
          type: "plan",
          payload: {
            plan: event.decision.plan,
          },
        });
      }
      return events;
    }
    case "workflow_started":
      return [{
        type: "tool_running",
        payload: {
          toolName: event.workflowName ?? event.toolName ?? null,
          workflowName: event.workflowName ?? null,
          message: event.message ?? null,
        },
      }];
    case "workflow_completed":
      return [{
        type: "tool_completed",
        payload: {
          toolName: event.workflowName ?? event.toolName ?? null,
          workflowName: event.workflowName ?? null,
          observation: event.observation ?? null,
          message: event.message ?? null,
        },
      }];
    case "workflow_failed":
      return [{
        type: "tool_failed",
        payload: {
          toolName: event.workflowName ?? event.toolName ?? null,
          workflowName: event.workflowName ?? null,
          observation: event.observation ?? null,
          error: event.error ?? event.message ?? null,
        },
      }];
    case "workflow_needs_input":
      return [{
        type: "approval_required",
        payload: {
          toolName: event.workflowName ?? event.toolName ?? null,
          workflowName: event.workflowName ?? null,
          observation: event.observation ?? null,
          message: event.message ?? null,
        },
      }];
    case "workflow_patch_planned":
      return [{
        type: "tool_planned",
        payload: {
          toolName: event.workflowName ?? event.toolName ?? "project_patch",
          workflowName: event.workflowName ?? null,
          patch: event.patch ?? null,
          message: event.message ?? null,
        },
      }];
    case "workflow_artifact_created":
      return [{
        type: "tool_completed",
        payload: {
          toolName: event.workflowName ?? event.toolName ?? null,
          workflowName: event.workflowName ?? null,
          message: event.message ?? null,
        },
      }];
    case "tool_planned":
    case "tool_running":
    case "tool_completed":
    case "tool_failed":
    case "approval_required":
      return [{
        type: event.type,
        payload: {
          toolName: event.toolName ?? event.observation?.toolName ?? null,
          toolCallId: event.toolCallId ?? event.observation?.toolCallId ?? null,
          observation: event.observation ?? null,
          error: event.error ?? null,
        },
      }];
    case "tool_verification_completed":
      return [{
        type: "tool_completed",
        payload: {
          toolName: event.toolName ?? null,
          toolCallId: event.toolCallId ?? null,
          operationIndex: event.operationIndex ?? null,
          operationType: event.operationType ?? null,
          verification: event.verification ?? null,
          message: event.message ?? null,
        },
      }];
    case "tool_verification_failed":
      return [{
        type: "tool_failed",
        payload: {
          toolName: event.toolName ?? null,
          toolCallId: event.toolCallId ?? null,
          operationIndex: event.operationIndex ?? null,
          operationType: event.operationType ?? null,
          verification: event.verification ?? null,
          error: event.error ?? event.message ?? null,
        },
      }];
    case "patch_planned":
      return [{
        type: "tool_planned",
        payload: {
          toolName: "project_patch",
          patch: event.patch ?? null,
          patchStatus: event.patchStatus ?? null,
          message: event.message ?? null,
        },
      }];
    case "patch_applying":
      return [{
        type: "tool_running",
        payload: {
          toolName: "project_patch",
          patch: event.patch ?? null,
          patchStatus: event.patchStatus ?? null,
          message: event.message ?? null,
        },
      }];
    case "patch_operation_running":
      return [{
        type: "tool_running",
        payload: {
          toolName: event.toolName ?? null,
          patch: event.patch ?? null,
          operationIndex: event.operationIndex ?? null,
          operationType: event.operationType ?? null,
          operationStatus: event.operationStatus ?? null,
          message: event.message ?? null,
        },
      }];
    case "patch_operation_completed":
      return [{
        type: "tool_completed",
        payload: {
          toolName: event.toolName ?? null,
          toolCallId: event.toolCallId ?? null,
          patch: event.patch ?? null,
          operationIndex: event.operationIndex ?? null,
          operationType: event.operationType ?? null,
          operationStatus: event.operationStatus ?? null,
          message: event.message ?? null,
        },
      }];
    case "patch_operation_failed":
      return [{
        type: "tool_failed",
        payload: {
          toolName: event.toolName ?? null,
          toolCallId: event.toolCallId ?? null,
          patch: event.patch ?? null,
          operationIndex: event.operationIndex ?? null,
          operationType: event.operationType ?? null,
          operationStatus: event.operationStatus ?? null,
          error: event.error ?? event.message ?? null,
        },
      }];
    case "patch_operation_awaiting_approval":
      return [{
        type: "approval_required",
        payload: {
          toolName: event.toolName ?? null,
          toolCallId: event.toolCallId ?? null,
          patch: event.patch ?? null,
          operationIndex: event.operationIndex ?? null,
          operationType: event.operationType ?? null,
          operationStatus: event.operationStatus ?? null,
          message: event.message ?? null,
        },
      }];
    case "patch_completed":
      return [{
        type: "tool_completed",
        payload: {
          toolName: "project_patch",
          patch: event.patch ?? null,
          patchStatus: event.patchStatus ?? null,
          message: event.message ?? null,
        },
      }];
    case "patch_partial_failed":
    case "patch_failed":
      return [{
        type: "tool_failed",
        payload: {
          toolName: "project_patch",
          patch: event.patch ?? null,
          patchStatus: event.patchStatus ?? null,
          error: event.error ?? event.message ?? null,
        },
      }];
    case "patch_approval_required":
      return [{
        type: "approval_required",
        payload: {
          toolName: "project_patch",
          patch: event.patch ?? null,
          patchStatus: event.patchStatus ?? null,
          message: event.message ?? null,
        },
      }];
    case "memory_updated":
      return [{
        type: "goal_updated",
        payload: {
          message: event.message ?? null,
        },
      }];
    case "final_response":
      return [{
        type: "message_delta",
        payload: {
          text: event.response ?? "",
        },
      }];
    case "run_completed":
      return [{
        type: "run_completed",
        payload: {
          threadId: event.threadId ?? null,
          runId: event.runId ?? null,
          waitingForUser: event.waitingForUser ?? false,
        },
      }];
  }
}
