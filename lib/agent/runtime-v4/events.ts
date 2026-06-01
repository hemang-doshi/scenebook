import type { AgentEventType } from "@/lib/agent/runtime-v3/types";
import type { AgentDecision } from "@/lib/agent/runtime-v4/decision/schemas";
import type { AgentPlan, ToolObservation } from "@/lib/agent/runtime-v3/types";

export type RuntimeV4EventType =
  | "run_started"
  | "agent_thinking"
  | "decision_made"
  | "tool_planned"
  | "tool_running"
  | "tool_completed"
  | "tool_failed"
  | "approval_required"
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
  observation?: ToolObservation;
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
