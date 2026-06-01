import type { ModelGateway } from "@/lib/ai/model-gateway";
import { generateFinalResponse } from "@/lib/agent/runtime-v4/model";
import type {
  SceneBookGraphState,
  SceneBookGraphUpdate,
} from "@/lib/agent/runtime-v4/graph/state";

export type ComposeResponseNodeOptions = {
  model?: string;
  modelGateway?: ModelGateway;
};

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

function deterministicResponse(state: SceneBookGraphState) {
  return state.finalResponse
    ?? (state.askQuestion ? responseForQuestions(state) : undefined)
    ?? (state.plan ? responseForPlan(state) : undefined)
    ?? fallbackResponse(state);
}

function finalResponsePrompt(state: SceneBookGraphState, fallback: string) {
  return [
    "Compose the final user-facing SceneBook runtime response.",
    "Synthesize what was understood, what was done or planned, what changed, what input is needed, and the next best action.",
    "Do not claim workspace changes were applied unless the graph state says they were.",
    `User goal:\n${state.goal}`,
    `Intent:\n${JSON.stringify(state.currentIntent ?? null)}`,
    `Decision:\n${JSON.stringify(state.currentDecision ?? null)}`,
    `Plan:\n${JSON.stringify(state.plan ?? null)}`,
    `Stop reason:\n${state.stopReason ?? "unknown"}`,
    `Fallback draft:\n${fallback}`,
  ].join("\n\n");
}

async function composeWithModel(
  state: SceneBookGraphState,
  fallback: string,
  options: ComposeResponseNodeOptions,
) {
  if (state.finalResponse || state.askQuestion || state.stopReason === "approval_required" || state.errors.length > 0) {
    return fallback;
  }

  try {
    const result = await generateFinalResponse({
      model: options.model,
      modelGateway: options.modelGateway,
      system: "You are SceneBook's runtime-v4 final response composer.",
      prompt: finalResponsePrompt(state, fallback),
      metadata: {
        fallbackText: fallback,
      },
    });

    return result.text.trim() || fallback;
  } catch {
    return fallback;
  }
}

export function createComposeResponseNode(options: ComposeResponseNodeOptions = {}) {
  return async function composeResponseNode(state: SceneBookGraphState): Promise<SceneBookGraphUpdate> {
    const fallback = deterministicResponse(state);
    const response = await composeWithModel(state, fallback, options);
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
  };
}

export const composeResponseNode = createComposeResponseNode();
