import { END, START, StateGraph } from "@langchain/langgraph";

import type { ModelGateway } from "@/lib/ai/model-gateway";
import { createCheckGoalNode } from "@/lib/agent/runtime-v4/graph/nodes/check-goal";
import { composeResponseNode } from "@/lib/agent/runtime-v4/graph/nodes/compose-response";
import { createDecideNextStepNode } from "@/lib/agent/runtime-v4/graph/nodes/decide-next-step";
import {
  createExecuteStepNode,
  type RuntimeV4GraphStepExecutor,
} from "@/lib/agent/runtime-v4/graph/nodes/execute-step";
import { createLoadProjectMindNode } from "@/lib/agent/runtime-v4/graph/nodes/load-project-mind";
import { observeResultNode } from "@/lib/agent/runtime-v4/graph/nodes/observe-result";
import { understandIntentNode } from "@/lib/agent/runtime-v4/graph/nodes/understand-intent";
import {
  SceneBookGraphAnnotation,
  type SceneBookGraphInput,
  type SceneBookGraphState,
} from "@/lib/agent/runtime-v4/graph/state";
import type { ProjectMindStores } from "@/lib/agent/runtime-v4/memory/memory-types";

export type CreateSceneBookGraphOptions = {
  stores?: ProjectMindStores;
  model?: string;
  modelGateway?: ModelGateway;
  toolSummaries?: unknown;
  executeStep?: RuntimeV4GraphStepExecutor;
};

function routeAfterGoalCheck(state: SceneBookGraphState) {
  return state.stopReason ? "compose_response" : "decide_next_step";
}

export function createSceneBookGraph(options: CreateSceneBookGraphOptions = {}) {
  return new StateGraph(SceneBookGraphAnnotation)
    .addNode("load_project_mind", createLoadProjectMindNode({ stores: options.stores }))
    .addNode("understand_intent", understandIntentNode)
    .addNode("decide_next_step", createDecideNextStepNode({
      model: options.model,
      modelGateway: options.modelGateway,
      toolSummaries: options.toolSummaries,
    }))
    .addNode("execute_step", createExecuteStepNode({ executeStep: options.executeStep }))
    .addNode("observe_result", observeResultNode)
    .addNode("check_goal", createCheckGoalNode({
      model: options.model,
      modelGateway: options.modelGateway,
    }))
    .addNode("compose_response", composeResponseNode)
    .addEdge(START, "load_project_mind")
    .addEdge("load_project_mind", "understand_intent")
    .addEdge("understand_intent", "decide_next_step")
    .addEdge("decide_next_step", "execute_step")
    .addEdge("execute_step", "observe_result")
    .addEdge("observe_result", "check_goal")
    .addConditionalEdges("check_goal", routeAfterGoalCheck, {
      decide_next_step: "decide_next_step",
      compose_response: "compose_response",
    })
    .addEdge("compose_response", END)
    .compile();
}

export async function runSceneBookGraph(
  input: SceneBookGraphInput & CreateSceneBookGraphOptions,
) {
  const graph = createSceneBookGraph({
    stores: input.stores,
    model: input.model,
    modelGateway: input.modelGateway,
    toolSummaries: input.toolSummaries,
    executeStep: input.executeStep,
  });
  const messages = input.messages?.length
    ? input.messages
    : [{ role: "user" as const, content: input.goal }];
  const runStarted = {
    type: "run_started" as const,
    runId: input.runId,
    threadId: input.threadId ?? null,
  };

  const state = await graph.invoke({
    projectId: input.projectId,
    userId: input.userId,
    threadId: input.threadId,
    runId: input.runId,
    goal: input.goal,
    messages,
    maxSteps: input.maxSteps ?? 8,
    events: [runStarted],
  });

  return {
    ...state,
    events: [
      ...state.events,
      {
        type: "run_completed" as const,
        runId: input.runId,
        threadId: input.threadId ?? null,
        waitingForUser: state.stopReason === "ask_question" || state.stopReason === "approval_required",
      },
    ],
  };
}
