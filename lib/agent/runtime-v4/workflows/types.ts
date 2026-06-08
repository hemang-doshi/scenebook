import type { ModelGateway } from "@/lib/ai/model-gateway";
import type { RuntimeV4Event } from "@/lib/agent/runtime-v4/events";
import type { SceneBookGraphState } from "@/lib/agent/runtime-v4/graph/state";
import type {
  CompactProjectMind,
  ProjectMindSnapshot,
} from "@/lib/agent/runtime-v4/memory/memory-types";
import type { PatchExecutionContext } from "@/lib/agent/runtime-v4/patch/patch-results";
import type { ProjectPatch } from "@/lib/agent/runtime-v4/patch/project-patch";
import type { JsonValue } from "@/lib/types";
import type { z } from "zod";

export const runtimeV4WorkflowNames = [
  "plan_reel",
  "create_script_package",
  "create_shoot_pack",
  "create_asset_prompt_pack",
  "review_content",
  "prepare_publish_package",
  "create_full_production_package",
] as const;

export type RuntimeV4WorkflowName = (typeof runtimeV4WorkflowNames)[number];

export type CreativeArtifactPreview = {
  type: string;
  title: string;
  summary: string;
  payload?: Record<string, JsonValue>;
};

export type CreativeWorkflowResult =
  | {
      status: "completed";
      workflowName: RuntimeV4WorkflowName;
      response: string;
      artifacts?: CreativeArtifactPreview[];
      patch?: ProjectPatch;
      events?: RuntimeV4Event[];
    }
  | {
      status: "needs_input";
      workflowName: RuntimeV4WorkflowName;
      questions: string[];
      reason: string;
    }
  | {
      status: "failed";
      workflowName: RuntimeV4WorkflowName;
      error: {
        code: string;
        message: string;
        recoverable: boolean;
        details?: Record<string, JsonValue>;
      };
    };

export type CreativeWorkflowContext = {
  projectMind: ProjectMindSnapshot;
  compactProjectMind: CompactProjectMind;
  modelGateway?: ModelGateway;
  runtimeContext: PatchExecutionContext;
  state?: SceneBookGraphState;
};

export type CreativeWorkflow<TInput = unknown, TOutput = unknown> = {
  name: RuntimeV4WorkflowName;
  displayName: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  handler(input: TInput, context: CreativeWorkflowContext): Promise<CreativeWorkflowResult> | CreativeWorkflowResult;
};

export type JsonObject = Record<string, JsonValue>;

export function toJsonObject(value: unknown): JsonObject {
  return JSON.parse(JSON.stringify(value ?? {})) as JsonObject;
}
