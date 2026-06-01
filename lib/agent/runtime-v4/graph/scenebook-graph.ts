import { END, START, StateGraph } from "@langchain/langgraph";

import { finalResponseNode } from "@/lib/agent/runtime-v4/graph/nodes/final-response";
import { createLoadProjectMindNode } from "@/lib/agent/runtime-v4/graph/nodes/load-project-mind";
import { proposePlanNode } from "@/lib/agent/runtime-v4/graph/nodes/propose-plan";
import { understandIntentNode } from "@/lib/agent/runtime-v4/graph/nodes/understand-intent";
import {
  SceneBookGraphAnnotation,
  type SceneBookGraphInput,
} from "@/lib/agent/runtime-v4/graph/state";
import type { ProjectMindStores } from "@/lib/agent/runtime-v4/memory/memory-types";

export type CreateSceneBookGraphOptions = {
  stores?: ProjectMindStores;
};

export function createSceneBookGraph(options: CreateSceneBookGraphOptions = {}) {
  return new StateGraph(SceneBookGraphAnnotation)
    .addNode("loadProjectMind", createLoadProjectMindNode({ stores: options.stores }))
    .addNode("understandIntent", understandIntentNode)
    .addNode("proposePlan", proposePlanNode)
    .addNode("produceFinalResponse", finalResponseNode)
    .addEdge(START, "loadProjectMind")
    .addEdge("loadProjectMind", "understandIntent")
    .addEdge("understandIntent", "proposePlan")
    .addEdge("proposePlan", "produceFinalResponse")
    .addEdge("produceFinalResponse", END)
    .compile();
}

export async function runSceneBookGraph(
  input: SceneBookGraphInput & CreateSceneBookGraphOptions,
) {
  const graph = createSceneBookGraph({
    stores: input.stores,
  });
  const messages = input.messages?.length
    ? input.messages
    : [{ role: "user" as const, content: input.goal }];

  return graph.invoke({
    projectId: input.projectId,
    userId: input.userId,
    threadId: input.threadId,
    goal: input.goal,
    messages,
  });
}
