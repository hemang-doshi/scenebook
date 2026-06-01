import type { AgentDecision } from "@/lib/agent/runtime-v4/decision/schemas";
import type {
  SceneBookGraphState,
  SceneBookGraphUpdate,
} from "@/lib/agent/runtime-v4/graph/state";
import type { ToolObservation } from "@/lib/agent/runtime-v3/types";

export type RuntimeV4GraphStepExecutorInput = {
  state: SceneBookGraphState;
  decision: Extract<AgentDecision, { type: "tool_call" | "workflow_call" }>;
};

export type RuntimeV4GraphStepExecutor = (
  input: RuntimeV4GraphStepExecutorInput,
) => Promise<ToolObservation[]> | ToolObservation[];

export type ExecuteStepNodeOptions = {
  executeStep?: RuntimeV4GraphStepExecutor;
};

function questionResponse(decision: Extract<AgentDecision, { type: "ask_question" }>) {
  return [
    "I need a little more context before I continue:",
    ...decision.questions.map((question, index) => `${index + 1}. ${question}`),
  ].join("\n");
}

function stubbedObservation(decision: Extract<AgentDecision, { type: "tool_call" | "workflow_call" }>): ToolObservation {
  const toolName = decision.type === "tool_call" ? decision.toolName : decision.workflowName;
  return {
    toolName,
    status: "blocked",
    message: "No runtime-v4 tool executor is wired for this graph decision yet.",
    output: {
      kind: "runtime_v4_executor_missing",
      decisionType: decision.type,
    },
  };
}

function approvalFromObservation(observation: ToolObservation) {
  if (observation.status !== "awaiting_approval") {
    return undefined;
  }

  return {
    toolName: observation.toolName,
    reason: observation.message,
    preview: observation.policy?.preview,
  };
}

export function createExecuteStepNode(options: ExecuteStepNodeOptions = {}) {
  return async function executeStepNode(state: SceneBookGraphState): Promise<SceneBookGraphUpdate> {
    const decision = state.currentDecision;
    if (!decision) {
      return {
        errors: ["No graph decision was available to execute."],
        observations: [{
          type: "error",
          message: "No graph decision was available to execute.",
        }],
      };
    }

    if (decision.type === "final_response") {
      return {
        finalResponse: decision.response,
      };
    }

    if (decision.type === "ask_question") {
      return {
        askQuestion: decision,
        finalResponse: questionResponse(decision),
      };
    }

    if (decision.type === "propose_plan") {
      return {
        plan: decision.plan,
        observations: [
          {
            type: "plan_proposed",
            message: `Proposed ${decision.plan.steps.length} no-write planning steps.`,
            data: {
              title: decision.plan.title,
              stepCount: decision.plan.steps.length,
            },
          },
        ],
      };
    }

    if (decision.type === "stop_with_error") {
      return {
        errors: [decision.message],
        observations: [{
          type: "error",
          message: decision.message,
        }],
      };
    }

    const toolResults = options.executeStep
      ? await options.executeStep({ state, decision })
      : [stubbedObservation(decision)];
    const approvalRequest = toolResults.map(approvalFromObservation).find(Boolean);

    return {
      toolResults,
      approvalRequest,
      events: toolResults.map((observation) => ({
        type: observation.status === "completed"
          ? "tool_completed"
          : observation.status === "awaiting_approval"
            ? "approval_required"
            : "tool_failed",
        runId: state.runId,
        threadId: state.threadId ?? null,
        toolName: observation.toolName,
        toolCallId: observation.toolCallId,
        observation,
        error: observation.status === "completed" ? undefined : observation.message,
      })),
      observations: toolResults.map((observation) => ({
        type: "step_executed",
        message: observation.message,
        data: {
          toolName: observation.toolName,
          status: observation.status,
        },
      })),
    };
  };
}
