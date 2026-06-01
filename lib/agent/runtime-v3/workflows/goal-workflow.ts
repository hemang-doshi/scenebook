import { executeRuntimeV3Tool } from "@/lib/agent/runtime-v3/tools/executor";
import type { WorkflowRunInput, WorkflowResult } from "@/lib/agent/runtime-v3/workflows/types";

export async function runGoalWorkflow(input: WorkflowRunInput): Promise<WorkflowResult> {
  const next = input.snapshot.readiness.nextLikelyStage;
  const observation = await executeRuntimeV3Tool({
    toolName: "update_active_goal",
    rawInput: {
      title: "Take project from idea to publish",
      stage: next,
      completedSteps: [],
      nextActions: input.snapshot.readiness.missing.length > 0
        ? input.snapshot.readiness.missing.map((item) => `Complete ${item}`)
        : ["Prepare publish package"],
      blockers: [],
    },
    context: input.context,
    snapshot: input.snapshot,
    stream: input.stream,
  });

  return {
    observations: [observation],
    finalResponse: observation.status === "completed"
      ? `Active goal created. Current stage: ${next}.`
      : `I could not update the active goal: ${observation.message}`,
  };
}
