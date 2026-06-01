import type { AgentDecision, ProjectSnapshot, ToolContext, ToolObservation } from "@/lib/agent/runtime-v3/types";
import type { AgentStream } from "@/lib/agent/runtime-v3/stream";

export type WorkflowResult = {
  finalResponse?: string;
  waitingForUser?: boolean;
  observations: ToolObservation[];
};

export type WorkflowHandlerInput = {
  workflowInput: unknown;
  context: Omit<ToolContext, "toolCallId">;
  snapshot: ProjectSnapshot;
  stream: AgentStream;
};

export type WorkflowRunInput = {
  decision: Extract<AgentDecision, { type: "workflow_call" }>;
  context: Omit<ToolContext, "toolCallId">;
  snapshot: ProjectSnapshot;
  stream: AgentStream;
};
