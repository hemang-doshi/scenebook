import type { ModelGateway } from "@/lib/ai/model-gateway";
import { decideNextStep } from "@/lib/agent/runtime-v4/decision/decision-engine";
import type { AgentDecision } from "@/lib/agent/runtime-v4/decision/schemas";
import { buildNoWritePlan } from "@/lib/agent/runtime-v4/graph/nodes/propose-plan";
import type {
  SceneBookGraphState,
  SceneBookGraphUpdate,
} from "@/lib/agent/runtime-v4/graph/state";

export type DecideNextStepNodeOptions = {
  model?: string;
  modelGateway?: ModelGateway;
  toolSummaries?: unknown;
};

function isGracefulFallback(decision: AgentDecision) {
  return decision.type === "final_response"
    && decision.confidence <= 0.35
    && /^I can still help\b/i.test(decision.response);
}

function shouldUseNoWritePlanFallback(state: SceneBookGraphState, decision: AgentDecision) {
  return isGracefulFallback(decision)
    && state.toolResults.length === 0
    && Boolean(state.currentIntent?.requestedFormat ?? state.projectMind?.project.format);
}

export function createDecideNextStepNode(options: DecideNextStepNodeOptions = {}) {
  return async function decideNextStepNode(state: SceneBookGraphState): Promise<SceneBookGraphUpdate> {
    const snapshot = state.projectMind;
    if (!snapshot) {
      return {
        errors: ["ProjectMind was not loaded before decisioning."],
        observations: [{
          type: "error",
          message: "ProjectMind was not loaded before decisioning.",
        }],
      };
    }

    let decision = await decideNextStep({
      message: state.goal,
      snapshot,
      toolSummaries: options.toolSummaries ?? [],
      previousObservations: state.toolResults,
      model: options.model,
      modelGateway: options.modelGateway,
    });

    if (shouldUseNoWritePlanFallback(state, decision)) {
      decision = {
        type: "propose_plan",
        plan: buildNoWritePlan(state),
        reason: "The graph used deterministic no-write planning after model decisioning was unavailable.",
      };
    }

    return {
      currentDecision: decision,
      stepCount: state.stepCount + 1,
      events: [
        {
          type: "decision_made",
          runId: state.runId,
          threadId: state.threadId ?? null,
          decision,
        },
      ],
      observations: [
        {
          type: "decision_made",
          message: `Selected ${decision.type} as the next runtime step.`,
          data: {
            decisionType: decision.type,
          },
        },
      ],
    };
  };
}
