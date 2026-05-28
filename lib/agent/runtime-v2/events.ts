import type { JsonValue } from "@/lib/types";

export const runtimeV2ToolStatuses = [
  "planned",
  "running",
  "completed",
  "failed",
  "awaiting_approval",
  "approved",
  "rejected",
  "awaiting_input",
] as const;

export type RuntimeV2ToolStatus = (typeof runtimeV2ToolStatuses)[number];

export type RuntimeV2ToolEventType =
  | "tool_planned"
  | "tool_running"
  | "tool_completed"
  | "tool_failed"
  | "tool_awaiting_approval"
  | "tool_approved"
  | "tool_rejected"
  | "tool_awaiting_input";

export type RuntimeV2ToolEventPayload = {
  id: string;
  command: string | null;
  status: RuntimeV2ToolStatus;
  toolName: string;
  requiresApproval: boolean;
  approvalPolicy?: string;
  sideEffect?: string;
  purpose?: string;
  changedFields?: string[];
  errorMessage?: string | null;
  result?: {
    message?: string;
    output: Record<string, JsonValue>;
  } | null;
};

export function runtimeV2ToolEventType(status: RuntimeV2ToolStatus): RuntimeV2ToolEventType {
  switch (status) {
    case "planned":
      return "tool_planned";
    case "running":
      return "tool_running";
    case "completed":
      return "tool_completed";
    case "failed":
      return "tool_failed";
    case "awaiting_approval":
      return "tool_awaiting_approval";
    case "approved":
      return "tool_approved";
    case "rejected":
      return "tool_rejected";
    case "awaiting_input":
      return "tool_awaiting_input";
  }
}
