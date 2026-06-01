import type {
  AgentDecision,
  AgentWorkflowName,
  ProjectSnapshot,
  ToolObservation,
} from "@/lib/agent/runtime-v3/types";

export type TrajectoryExpectedStep =
  | {
      kind: "decision";
      decisionType: AgentDecision["type"];
      workflowName?: AgentWorkflowName;
    }
  | {
      kind: "tool";
      toolName: string;
      status?: ToolObservation["status"];
    };

export type TrajectoryTruthfulnessExpectation =
  | "mention_approval_when_required"
  | "no_success_claim_on_failure"
  | "no_publish_claim_without_publish_tool"
  | "no_editor_timeline_mutation_claim"
  | "no_workspace_mutation_claim";

export type TrajectoryFixture = {
  id: string;
  name: string;
  input: string;
  snapshot: ProjectSnapshot;
  expected: {
    decisionType: AgentDecision["type"];
    workflowName?: AgentWorkflowName;
    tools?: Array<{ toolName: string; status?: ToolObservation["status"] }>;
    waitingForUser?: boolean;
    finalResponseIncludes?: string[];
    finalResponseExcludes?: string[];
    truthfulness?: TrajectoryTruthfulnessExpectation[];
  };
};

export type TrajectoryResult = {
  fixtureId: string;
  fixtureName: string;
  decision: AgentDecision;
  steps: TrajectoryExpectedStep[];
  observations: ToolObservation[];
  finalResponse: string;
  waitingForUser: boolean;
  events: Array<{ type: string; payload: Record<string, unknown> }>;
  passed: boolean;
  failures: string[];
};
