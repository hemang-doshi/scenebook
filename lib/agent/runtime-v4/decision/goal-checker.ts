import type { ModelGateway } from "@/lib/ai/model-gateway";
import { createRuntimeV4ModelGateway } from "@/lib/agent/runtime-v4/model";
import type { ProjectSnapshot, ToolObservation } from "@/lib/agent/runtime-v3/types";
import {
  goalCheckSchema,
  type GoalCheck,
} from "@/lib/agent/runtime-v4/decision/schemas";

export type GoalCheckerInput = {
  message: string;
  snapshot: ProjectSnapshot;
  observations: ToolObservation[];
  workflowFinalResponse?: string;
  model?: string;
  modelGateway?: ModelGateway;
};

function deterministicGoalFallback(input: GoalCheckerInput): GoalCheck {
  const latest = input.observations.at(-1);

  if (latest?.status === "awaiting_approval") {
    return {
      status: "ask_user",
      questions: ["Do you want me to approve and continue this workspace change?"],
      reason: latest.message,
    };
  }

  if (latest?.status === "failed" || latest?.status === "blocked") {
    return {
      status: "ask_user",
      questions: ["Should I try a different path?"],
      reason: latest.message,
    };
  }

  if (input.workflowFinalResponse && input.observations.length === 0) {
    return {
      status: "satisfied",
      response: input.workflowFinalResponse,
      reason: "The workflow produced a final response without tool observations.",
    };
  }

  if (latest?.status === "completed" && latest.output?.kind === "creative_workflow") {
    const title = typeof latest.output.title === "string" ? latest.output.title : latest.toolName;
    return {
      status: "satisfied",
      response: `${title}: ${latest.message}`,
      reason: "The creative workflow completed the requested production step.",
    };
  }

  return {
    status: "continue",
    reason: "The latest observation completed, but goal satisfaction was not established.",
  };
}

export async function checkGoalProgress(input: GoalCheckerInput): Promise<GoalCheck> {
  const gateway = input.modelGateway ?? createRuntimeV4ModelGateway({
    model: input.model,
  });
  const prompt = [
    "Return exactly one JSON object evaluating whether the user's original goal is satisfied.",
    "Allowed statuses: satisfied, continue, ask_user, stop_with_error.",
    "Use satisfied only when the observations actually complete the user's request.",
    "Use continue when the agent should take another decision step.",
    "Use ask_user when the next safe step requires user input.",
    `User goal:\n${input.message.trim()}`,
    `Project snapshot:\n${JSON.stringify(input.snapshot)}`,
    `Observations:\n${JSON.stringify(input.observations)}`,
    `Workflow final response, if any:\n${input.workflowFinalResponse ?? ""}`,
  ].join("\n\n");

  try {
    const response = await gateway.generateStructured({
      profile: "critique",
      model: input.model,
      schema: goalCheckSchema,
      schemaName: "GoalCheck",
      schemaDescription: "Whether the SceneBook runtime has satisfied the user's goal.",
      system: "You are SceneBook's runtime-v4 goal checker. Return structured output only.",
      prompt,
    });
    return response.object;
  } catch {
    return deterministicGoalFallback(input);
  }
}
