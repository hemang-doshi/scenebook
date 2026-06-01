import type {
  SceneBookGraphState,
  SceneBookGraphUpdate,
} from "@/lib/agent/runtime-v4/graph/state";

export function observeResultNode(state: SceneBookGraphState): SceneBookGraphUpdate {
  const latest = state.toolResults.at(-1);
  if (!latest) {
    return {};
  }

  return {
    observations: [
      {
        type: "result_observed",
        message: latest.message,
        data: {
          toolName: latest.toolName,
          status: latest.status,
        },
      },
    ],
  };
}
