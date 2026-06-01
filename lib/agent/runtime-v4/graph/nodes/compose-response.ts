import type {
  SceneBookGraphState,
  SceneBookGraphUpdate,
} from "@/lib/agent/runtime-v4/graph/state";

function responseForQuestions(state: SceneBookGraphState) {
  const ask = state.askQuestion;
  if (!ask) {
    return "I need a little more context before I continue.";
  }

  return [
    "I need a little more context before I continue:",
    ...ask.questions.map((question, index) => `${index + 1}. ${question}`),
  ].join("\n");
}

function responseForPlan(state: SceneBookGraphState) {
  const plan = state.plan;
  if (!plan) {
    return "I loaded the project context, but I could not produce a plan.";
  }

  return [
    plan.title,
    "",
    ...plan.steps.map((step, index) => `${index + 1}. ${step.label}`),
    "",
    "No workspace changes were applied.",
  ].join("\n");
}

function fallbackResponse(state: SceneBookGraphState) {
  if (state.stopReason === "max_steps") {
    return `I hit the graph step limit (${state.maxSteps}) before I could safely complete that.`;
  }

  if (state.stopReason === "approval_required") {
    return "I need approval before I can continue with that workspace change.";
  }

  if (state.errors.length > 0) {
    return state.errors.at(-1) ?? "Agent Runtime v4 stopped with an unrecoverable error.";
  }

  return "I loaded the project context, but I could not produce a final response.";
}

export function composeResponseNode(state: SceneBookGraphState): SceneBookGraphUpdate {
  const response = state.finalResponse
    ?? (state.askQuestion ? responseForQuestions(state) : undefined)
    ?? (state.plan ? responseForPlan(state) : undefined)
    ?? fallbackResponse(state);
  const waitingForUser = state.stopReason === "ask_question" || state.stopReason === "approval_required";

  return {
    finalResponse: response,
    messages: [
      {
        role: "assistant",
        content: response,
        metadata: {
          orchestrator: "langgraph",
          stopReason: state.stopReason ?? "unknown",
        },
      },
    ],
    events: [
      {
        type: "final_response",
        runId: state.runId,
        threadId: state.threadId ?? null,
        response,
        waitingForUser,
      },
    ],
    observations: [
      {
        type: "final_response",
        message: "Composed final graph response.",
        data: {
          stopReason: state.stopReason ?? "unknown",
          waitingForUser,
        },
      },
    ],
  };
}
