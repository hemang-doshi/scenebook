import type { ProjectSnapshot, ToolObservation } from "@/lib/agent/runtime-v3/types";
import type { AgentDecision } from "@/lib/agent/runtime-v4/decision/schemas";

export type DecisionEngineInput = {
  message: string;
  snapshot: ProjectSnapshot;
  toolSummaries: unknown;
  previousObservations?: ToolObservation[];
  model?: string;
};

function compactJson(value: unknown) {
  return JSON.stringify(value);
}

export type DecisionPrompt = {
  system: string;
  prompt: string;
  model?: string;
};

export function createDecisionPrompt(input: DecisionEngineInput): DecisionPrompt {
  return {
    model: input.model,
    system: "You are SceneBook's runtime-v4 model-first decision engine. Return structured output only.",
    prompt: [
      "Return exactly one JSON object for the next SceneBook agent action.",
      "Choose the decision with the best next step for the user's goal.",
      "Allowed decision types: ask_question, propose_plan, tool_call, project_patch, workflow_call, final_response, stop_with_error.",
      "Prefer model reasoning over hard-coded intent rules.",
      "Use ask_question when the request is too vague to produce a useful result.",
      "Use workflow_call for multi-step SceneBook workflows such as script_workflow, workspace_control_workflow, asset_workflow, goal_workflow, editor_handoff_workflow, and publish_workflow.",
      "Use tool_call for one focused runtime tool when a workflow is unnecessary.",
      "Use project_patch for grouped durable workspace updates that should apply as one reviewed ProjectPatch.",
      "Use final_response only when no workspace action is needed or when the goal is already satisfied.",
      "Do not finalize only because a previous tool observation exists. Consider whether the original user goal is complete.",
      `Project snapshot:\n${compactJson(input.snapshot)}`,
      `Available tools:\n${compactJson(input.toolSummaries)}`,
      `Previous observations:\n${compactJson(input.previousObservations ?? [])}`,
      `User message:\n${input.message.trim()}`,
    ].join("\n\n"),
  };
}

export function createGracefulDecisionFallback(message: string): AgentDecision {
  const trimmed = message.trim();
  return {
    type: "final_response",
    response: trimmed
      ? `I can still help with that. Tell me the outcome you want for "${trimmed.slice(0, 120)}", and I will turn it into a concrete next step.`
      : "I can still help with that. Tell me the outcome you want, and I will turn it into a concrete next step.",
    confidence: 0.35,
  };
}

export function createDeterministicSafetyDecision(input: DecisionEngineInput): AgentDecision | null {
  const message = input.message.trim();
  const latestObservation = input.previousObservations?.at(-1);

  if (latestObservation?.status === "awaiting_approval") {
    return {
      type: "ask_question",
      questions: ["Do you want me to proceed with the requested workspace change?"],
      reason: "A previous tool requires approval before the agent can safely continue.",
      expectedFieldTargets: ["approval"],
    };
  }

  if (latestObservation?.status === "blocked" || latestObservation?.status === "failed") {
    return {
      type: "ask_question",
      questions: ["Do you want me to try a different approach?"],
      reason: latestObservation.message,
      expectedFieldTargets: ["nextAction"],
    };
  }

  if (/^\s*(write|make|create|draft|rewrite)\b.*\bscript\b/i.test(message)) {
    return {
      type: "workflow_call",
      workflowName: "script_workflow",
      input: { prompt: message },
      reason: "Safety fallback detected a direct script request after model decisioning failed.",
    };
  }

  return null;
}
