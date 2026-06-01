import type {
  SceneBookGraphState,
  SceneBookGraphUpdate,
} from "@/lib/agent/runtime-v4/graph/state";
import type { JsonValue } from "@/lib/types";

export function observeResultNode(state: SceneBookGraphState): SceneBookGraphUpdate {
  const latest = state.toolResults.at(-1);
  if (!latest) {
    return {};
  }
  const data: Record<string, JsonValue> = {
    toolName: latest.toolName,
    status: latest.status,
  };
  if (latest.output?.kind === "project_patch" && latest.output.patchStatus !== undefined) {
    Object.assign(data, { patchStatus: latest.output.patchStatus });
  }

  return {
    observations: [
      {
        type: "result_observed",
        message: latest.message,
        data,
      },
    ],
  };
}
