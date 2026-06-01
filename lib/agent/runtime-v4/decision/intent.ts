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
      "Use workflow_call for v4 creative workflows: plan_reel, create_script_package, create_shoot_pack, create_asset_prompt_pack, review_content, prepare_publish_package, and create_full_production_package.",
      "Use create_full_production_package when the user asks for the whole reel package, entire production plan, everything needed to shoot, complete video package, or end-to-end package.",
      "Prefer narrower workflows for specific requests: plan_reel for vague early creative requests, create_script_package for writing scripts, create_shoot_pack for shot lists, create_asset_prompt_pack for asset prompts, review_content for critique, and prepare_publish_package for captions/hashtags.",
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

  if (
    latestObservation?.status === "blocked" &&
    latestObservation.output?.kind === "creative_workflow_needs_input" &&
    Array.isArray(latestObservation.output.questions)
  ) {
    return {
      type: "ask_question",
      questions: latestObservation.output.questions.filter((question): question is string => typeof question === "string").slice(0, 3),
      reason: latestObservation.message,
      expectedFieldTargets: ["creativeContext"],
    };
  }

  if (/whole|entire|everything|complete|full package|production package/i.test(message)) {
    return {
      type: "workflow_call",
      workflowName: "create_full_production_package",
      input: { prompt: message },
      reason: "Safety fallback detected a request for a complete production package.",
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
      workflowName: "create_script_package",
      input: { prompt: message },
      reason: "Safety fallback detected a direct script request after model decisioning failed.",
    };
  }

  return null;
}
