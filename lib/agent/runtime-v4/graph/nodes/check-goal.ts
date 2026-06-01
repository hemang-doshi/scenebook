import type { ModelGateway } from "@/lib/ai/model-gateway";
import { checkGoalProgress } from "@/lib/agent/runtime-v4/decision/goal-checker";
import type {
  SceneBookGraphState,
  SceneBookGraphUpdate,
} from "@/lib/agent/runtime-v4/graph/state";

export type CheckGoalNodeOptions = {
  model?: string;
  modelGateway?: ModelGateway;
};

function shouldAskForApproval(state: SceneBookGraphState) {
  return state.approvalRequest ? "approval_required" : undefined;
}

export function createCheckGoalNode(options: CheckGoalNodeOptions = {}) {
  return async function checkGoalNode(state: SceneBookGraphState): Promise<SceneBookGraphUpdate> {
    if (state.finalResponse && state.currentDecision?.type === "final_response") {
      return {
        stopReason: "final_response",
        currentGoal: {
          originalRequest: state.goal,
          status: "satisfied",
          reason: "The graph produced a final response.",
        },
      };
    }

    if (state.askQuestion) {
      return {
        stopReason: "ask_question",
      };
    }

    const approvalStop = shouldAskForApproval(state);
    if (approvalStop) {
      return {
        stopReason: approvalStop,
      };
    }

    if (state.errors.length > 0) {
      return {
        stopReason: "unrecoverable_error",
      };
    }

    if (state.stepCount >= state.maxSteps) {
      const message = `Agent Runtime v4 stopped because the graph step limit (${state.maxSteps}) was reached.`;
      return {
        stopReason: "max_steps",
        errors: [message],
        observations: [
          {
            type: "error",
            message,
          },
        ],
      };
    }

    if (state.currentDecision?.type === "propose_plan" && state.plan) {
      return {
        stopReason: "goal_satisfied",
        currentGoal: {
          originalRequest: state.goal,
          status: "satisfied",
          reason: "The graph produced a no-write production plan.",
        },
      };
    }

    const latest = state.toolResults.at(-1);
    if (!latest || !state.projectMind) {
      return {};
    }

    const progress = await checkGoalProgress({
      message: state.goal,
      snapshot: state.projectMind,
      observations: [latest],
      model: options.model,
      modelGateway: options.modelGateway,
    });

    if (progress.status === "satisfied") {
      return {
        currentGoalCheck: progress,
        finalResponse: progress.response,
        stopReason: "goal_satisfied",
        observations: [
          {
            type: "goal_checked",
            message: progress.reason,
            data: {
              status: progress.status,
            },
          },
        ],
      };
    }

    if (progress.status === "ask_user") {
      return {
        currentGoalCheck: progress,
        askQuestion: {
          type: "ask_question",
          questions: progress.questions,
          reason: progress.reason,
        },
        stopReason: "ask_question",
        observations: [
          {
            type: "goal_checked",
            message: progress.reason,
            data: {
              status: progress.status,
            },
          },
        ],
      };
    }

    if (progress.status === "stop_with_error") {
      return {
        currentGoalCheck: progress,
        errors: [progress.message],
        stopReason: "unrecoverable_error",
      };
    }

    return {
      currentGoalCheck: progress,
      observations: [
        {
          type: "goal_checked",
          message: progress.reason,
          data: {
            status: progress.status,
          },
        },
      ],
    };
  };
}
