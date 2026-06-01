import type {
  SceneBookGraphState,
  SceneBookGraphUpdate,
} from "@/lib/agent/runtime-v4/graph/state";

export function finalResponseNode(state: SceneBookGraphState): SceneBookGraphUpdate {
  const plan = state.plan;
  const response = plan
    ? [
        plan.title,
        "",
        ...plan.steps.map((step, index) => `${index + 1}. ${step.label}`),
        "",
        "This LangGraph spike stops at planning only: no database writes, tool calls, or external integrations.",
      ].join("\n")
    : "I loaded the project context, but I could not produce a plan in this spike path.";

  return {
    finalResponse: response,
    messages: [
      {
        role: "assistant",
        content: response,
        metadata: {
          orchestrator: "langgraph",
          spike: true,
        },
      },
    ],
    observations: [
      {
        type: "final_response",
        message: "Produced final no-write spike response.",
        data: {
          hasPlan: Boolean(plan),
        },
      },
    ],
  };
}
