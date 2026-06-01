import { Annotation } from "@langchain/langgraph";

import type { AgentPlan } from "@/lib/agent/runtime-v3/types";
import type {
  CompactProjectMind,
  ProjectMindSnapshot,
} from "@/lib/agent/runtime-v4/memory/memory-types";
import type { JsonValue } from "@/lib/types";

export type SceneBookGraphMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  metadata?: Record<string, JsonValue>;
};

export type SceneBookGraphObservation = {
  type: "project_mind_loaded" | "intent_understood" | "plan_proposed" | "final_response";
  message: string;
  data?: Record<string, JsonValue>;
};

export type SceneBookGraphIntent = {
  summary: string;
  requestedFormat: string | null;
  topic: string | null;
  confidence: number;
  needsWorkspaceMutation: boolean;
};

export type SceneBookGraphPlan = AgentPlan;

function appendValues<T>(left: T[] = [], right: T[] = []) {
  return [...left, ...right];
}

export const SceneBookGraphAnnotation = Annotation.Root({
  projectId: Annotation<string>(),
  userId: Annotation<string>(),
  threadId: Annotation<string | undefined>(),
  goal: Annotation<string>(),
  messages: Annotation<SceneBookGraphMessage[]>({
    reducer: appendValues,
    default: () => [],
  }),
  observations: Annotation<SceneBookGraphObservation[]>({
    reducer: appendValues,
    default: () => [],
  }),
  projectMind: Annotation<ProjectMindSnapshot | undefined>(),
  compactProjectMind: Annotation<CompactProjectMind | undefined>(),
  intent: Annotation<SceneBookGraphIntent | undefined>(),
  plan: Annotation<SceneBookGraphPlan | undefined>(),
  finalResponse: Annotation<string | undefined>(),
});

export type SceneBookGraphState = typeof SceneBookGraphAnnotation.State;
export type SceneBookGraphUpdate = typeof SceneBookGraphAnnotation.Update;

export type SceneBookGraphInput = {
  projectId: string;
  userId: string;
  threadId?: string;
  goal: string;
  messages?: SceneBookGraphMessage[];
};
