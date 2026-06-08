import type { ModelGateway } from "@/lib/ai/model-gateway";
import { decideNextStep } from "@/lib/agent/runtime-v4/decision/decision-engine";
import type {
  SceneBookGraphState,
  SceneBookGraphUpdate,
} from "@/lib/agent/runtime-v4/graph/state";

export type DecideNextStepNodeOptions = {
  model?: string;
  modelGateway?: ModelGateway;
  toolSummaries?: unknown;
};

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

    const decision = await decideNextStep({
      message: state.goal,
      effectivePrompt: state.effectivePrompt,
      commandHint: state.commandHint,
      commandInput: state.commandInput,
      intentHint: state.intentHint,
      snapshot,
      toolSummaries: options.toolSummaries ?? [],
      previousObservations: state.toolResults,
      model: options.model,
      modelGateway: options.modelGateway,
    });

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
