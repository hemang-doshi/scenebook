import type { AgentDecision } from "@/lib/agent/runtime-v4/decision/schemas";
import type {
  SceneBookGraphState,
  SceneBookGraphUpdate,
} from "@/lib/agent/runtime-v4/graph/state";
import type {
  WorkflowExecutionInput,
  WorkflowExecutionResult,
} from "@/lib/agent/runtime-v4/workflows/workflow-executor";
import type { JsonValue } from "@/lib/types";

type WorkflowDecision = Extract<AgentDecision, { type: "workflow_call" }>;

export type RuntimeV4GraphWorkflowExecutor = {
  execute(input: WorkflowExecutionInput): Promise<WorkflowExecutionResult> | WorkflowExecutionResult;
};

export type ExecuteWorkflowNodeOptions = {
  workflowExecutor: RuntimeV4GraphWorkflowExecutor;
};

function approvalFromWorkflow(result: WorkflowExecutionResult) {
  if (result.observation.status !== "awaiting_approval") {
    return undefined;
  }

  return {
    toolName: result.observation.toolName,
    reason: result.observation.message,
    preview: result.observation.output,
  };
}

function askQuestionFromWorkflow(
  decision: WorkflowDecision,
  result: WorkflowExecutionResult,
): Extract<AgentDecision, { type: "ask_question" }> | undefined {
  if (result.workflowResult.status !== "needs_input") {
    return undefined;
  }

  return {
    type: "ask_question",
    questions: result.workflowResult.questions,
    reason: result.workflowResult.reason || decision.reason,
  };
}

function jsonRecord(value: unknown): Record<string, JsonValue> {
  try {
    const json = JSON.parse(JSON.stringify(value ?? null)) as JsonValue;
    if (json && typeof json === "object" && !Array.isArray(json)) {
      return json as Record<string, JsonValue>;
    }

    return { value: json };
  } catch {
    return { value: String(value) };
  }
}

function questionResponse(ask: Extract<AgentDecision, { type: "ask_question" }>) {
  return [
    "I need a little more context before I continue:",
    ...ask.questions.map((question, index) => `${index + 1}. ${question}`),
  ].join("\n");
}

export function createExecuteWorkflowNode(options: ExecuteWorkflowNodeOptions) {
  return async function executeWorkflowNode(state: SceneBookGraphState): Promise<SceneBookGraphUpdate> {
    const decision = state.currentDecision;
    if (!decision || decision.type !== "workflow_call") {
      return {
        errors: ["No workflow decision was available to execute."],
        observations: [{
          type: "error",
          message: "No workflow decision was available to execute.",
        }],
      };
    }

    const result = await options.workflowExecutor.execute({
      workflowName: decision.workflowName,
      input: decision.input,
      state,
      context: {
        userId: state.userId,
        projectId: state.projectId,
        threadId: state.threadId,
        runId: state.runId,
        source: "agent",
        rawInput: state.goal,
      },
    });
    const askQuestion = askQuestionFromWorkflow(decision, result);

    return {
      toolResults: [result.observation],
      approvalRequest: approvalFromWorkflow(result),
      askQuestion,
      finalResponse: askQuestion ? questionResponse(askQuestion) : undefined,
      events: result.events,
      observations: [
        {
          type: "step_executed",
          message: result.observation.message,
          data: {
            workflowName: decision.workflowName,
            status: result.observation.status,
            output: jsonRecord(result.observation.output),
          },
        },
      ],
    };
  };
}
