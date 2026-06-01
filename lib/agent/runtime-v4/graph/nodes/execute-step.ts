import type { AgentDecision } from "@/lib/agent/runtime-v4/decision/schemas";
import type {
  SceneBookGraphState,
  SceneBookGraphUpdate,
} from "@/lib/agent/runtime-v4/graph/state";
import type { ToolObservation } from "@/lib/agent/runtime-v3/types";
import { PatchExecutor, type ToolExecutorLike } from "@/lib/agent/runtime-v4/patch/patch-executor";
import type {
  GraphPatchExecutionResult,
  PatchExecutionContext,
  ToolExecutionLike,
} from "@/lib/agent/runtime-v4/patch/patch-results";
import { projectPatchExecutionResultToObservation } from "@/lib/agent/runtime-v4/patch/patch-results";
import { toolVerificationEvent } from "@/lib/agent/runtime-v4/patch/patch-verifier";
import type { RuntimeV4Event } from "@/lib/agent/runtime-v4/events";
import type { JsonValue } from "@/lib/types";
import {
  createExecuteWorkflowNode,
  type RuntimeV4GraphWorkflowExecutor,
} from "@/lib/agent/runtime-v4/graph/nodes/execute-workflow";

type ExecutableDecision = Extract<AgentDecision, {
  type: "tool_call" | "workflow_call" | "project_patch";
}>;

export type RuntimeV4GraphStepExecutorInput = {
  state: SceneBookGraphState;
  decision: ExecutableDecision;
};

export type RuntimeV4GraphStepExecutor = (
  input: RuntimeV4GraphStepExecutorInput,
) => Promise<ToolObservation[]> | ToolObservation[];

export type RuntimeV4GraphPatchExecutor = {
  apply(input: {
    patch: Extract<AgentDecision, { type: "project_patch" }>["patch"];
    context: PatchExecutionContext;
  }): Promise<GraphPatchExecutionResult> | GraphPatchExecutionResult;
};

export type ExecuteStepNodeOptions = {
  executeStep?: RuntimeV4GraphStepExecutor;
  toolExecutor?: ToolExecutorLike;
  patchExecutor?: RuntimeV4GraphPatchExecutor;
  workflowExecutor?: RuntimeV4GraphWorkflowExecutor;
};

function questionResponse(decision: Extract<AgentDecision, { type: "ask_question" }>) {
  return [
    "I need a little more context before I continue:",
    ...decision.questions.map((question, index) => `${index + 1}. ${question}`),
  ].join("\n");
}

function stubbedObservation(decision: ExecutableDecision): ToolObservation {
  const toolName = decision.type === "tool_call"
    ? decision.toolName
    : decision.type === "workflow_call"
      ? decision.workflowName
      : "project_patch";
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
    preview: observation.policy?.preview
      ?? (observation.output?.kind === "project_patch" ? observation.output : undefined),
  };
}

function executionContext(state: SceneBookGraphState): PatchExecutionContext {
  return {
    userId: state.userId,
    projectId: state.projectId,
    threadId: state.threadId,
    runId: state.runId,
    source: "agent",
  };
}

function jsonRecord(value: unknown): Record<string, JsonValue> | undefined {
  if (value === undefined) {
    return undefined;
  }

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

function toolResultMessage(result: ToolExecutionLike) {
  if (typeof result.message === "string" && result.message.trim()) {
    return result.message;
  }

  if (result.error?.message) {
    return result.error.message;
  }

  if (result.status === "completed") {
    return `${result.toolName} completed.`;
  }

  if (result.status === "awaiting_approval") {
    return `${result.toolName} is awaiting approval.`;
  }

  return `${result.toolName} did not complete.`;
}

function toolResultToObservation(result: ToolExecutionLike): ToolObservation {
  const output = jsonRecord(result.output);
  if (result.verification) {
    return {
      toolName: result.toolName,
      toolCallId: result.toolCallId,
      status: result.status,
      message: toolResultMessage(result),
      output: {
        ...(output ?? {}),
        verification: jsonRecord(result.verification) ?? {},
      },
      policy: jsonRecord(result.policy) as ToolObservation["policy"] | undefined,
      record: result.record as ToolObservation["record"] | undefined,
    };
  }

  return {
    toolName: result.toolName,
    toolCallId: result.toolCallId,
    status: result.status,
    message: toolResultMessage(result),
    output,
    policy: jsonRecord(result.policy) as ToolObservation["policy"] | undefined,
    record: result.record as ToolObservation["record"] | undefined,
  };
}

function eventsFromObservations(
  state: SceneBookGraphState,
  toolResults: ToolObservation[],
): RuntimeV4Event[] {
  return toolResults.map((observation) => ({
    type: observation.status === "completed"
      ? "tool_completed" as const
      : observation.status === "awaiting_approval"
        ? "approval_required" as const
        : "tool_failed" as const,
    runId: state.runId,
    threadId: state.threadId ?? null,
    toolName: observation.toolName,
    toolCallId: observation.toolCallId,
    observation,
    error: observation.status === "completed" ? undefined : observation.message,
  }));
}

function eventsFromToolResult(
  state: SceneBookGraphState,
  result: ToolExecutionLike,
  observation: ToolObservation,
): RuntimeV4Event[] {
  const verificationEvent = toolVerificationEvent({
    result,
    runId: state.runId,
    threadId: state.threadId ?? null,
  });

  return [
    ...(verificationEvent ? [verificationEvent] : []),
    ...eventsFromObservations(state, [observation]),
  ];
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

    let toolResults: ToolObservation[];
    let events: RuntimeV4Event[];

    if (options.executeStep) {
      toolResults = await options.executeStep({ state, decision });
      events = eventsFromObservations(state, toolResults);
    } else if (decision.type === "tool_call" && options.toolExecutor) {
      const toolResult = await options.toolExecutor.execute({
        toolName: decision.toolName,
        input: decision.input,
        context: executionContext(state),
      });
      const observation = toolResultToObservation(toolResult);
      toolResults = [observation];
      events = eventsFromToolResult(state, toolResult, observation);
    } else if (decision.type === "project_patch") {
      const patchExecutor = options.patchExecutor
        ?? (options.toolExecutor ? new PatchExecutor({ toolExecutor: options.toolExecutor }) : undefined);
      if (patchExecutor) {
        const patchResult = await patchExecutor.apply({
          patch: decision.patch,
          context: executionContext(state),
        });
        toolResults = [projectPatchExecutionResultToObservation(patchResult)];
        events = patchResult.events.length ? patchResult.events : eventsFromObservations(state, toolResults);
      } else {
        toolResults = [stubbedObservation(decision)];
        events = eventsFromObservations(state, toolResults);
      }
    } else if (decision.type === "workflow_call") {
      const workflowExecutor = options.workflowExecutor;
      if (workflowExecutor) {
        const update = await createExecuteWorkflowNode({ workflowExecutor })({
          ...state,
          currentDecision: decision,
        });
        return update;
      }

      toolResults = [stubbedObservation(decision)];
      events = eventsFromObservations(state, toolResults);
    } else {
      toolResults = [stubbedObservation(decision)];
      events = eventsFromObservations(state, toolResults);
    }

    const approvalRequest = toolResults.map(approvalFromObservation).find(Boolean);

    return {
      toolResults,
      approvalRequest,
      events,
      observations: toolResults.map((observation) => {
        const data: Record<string, JsonValue> = {
          toolName: observation.toolName,
          status: observation.status,
        };
        if (observation.output?.kind === "project_patch" && observation.output.patchStatus !== undefined) {
          data.patchStatus = observation.output.patchStatus;
        }

        return {
          type: "step_executed",
          message: observation.message,
          data,
        };
      }),
    };
  };
}
