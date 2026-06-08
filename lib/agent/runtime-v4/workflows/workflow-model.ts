import type { ModelProfileName, ModelUsage } from "@/lib/ai/model-gateway";
import type { CreativeWorkflowResult, RuntimeV4WorkflowName } from "@/lib/agent/runtime-v4/workflows/types";
import type { CreativeWorkflowContext } from "@/lib/agent/runtime-v4/workflows/types";
import { toJsonObject } from "@/lib/agent/runtime-v4/workflows/types";
import type { z } from "zod";

export type WorkflowModelMetadata = {
  modelUsed: boolean;
  fallbackUsed: boolean;
  modelError?: {
    name: string;
    message: string;
  };
  rawText?: string;
  finishReason?: string;
  usage?: ModelUsage;
};

export type WorkflowModelResult<TOutput> =
  | { status: "completed"; output: TOutput; metadata: WorkflowModelMetadata }
  | { status: "failed"; metadata: WorkflowModelMetadata };

function errorMetadata(caught: unknown) {
  return caught instanceof Error
    ? { name: caught.name, message: caught.message }
    : { name: "UnknownError", message: String(caught) };
}

export async function generateWorkflowStructured<TOutput>(input: {
  workflowName: string;
  profile?: ModelProfileName;
  schema: z.ZodType<TOutput>;
  schemaName: string;
  schemaDescription?: string;
  system: string;
  prompt: string;
  context: CreativeWorkflowContext;
}): Promise<WorkflowModelResult<TOutput>> {
  const gateway = input.context.modelGateway;

  if (!gateway) {
    return {
      status: "failed",
      metadata: {
        modelUsed: false,
        fallbackUsed: true,
        modelError: {
          name: "ModelGatewayUnavailable",
          message: "No model gateway was available for creative workflow generation.",
        },
      },
    };
  }

  try {
    const result = await gateway.generateStructured<TOutput>({
      profile: input.profile ?? "creative_generation",
      schema: input.schema,
      schemaName: input.schemaName,
      schemaDescription: input.schemaDescription,
      system: input.system,
      prompt: input.prompt,
      metadata: { workflowName: input.workflowName },
    });

    return {
      status: "completed",
      output: result.object,
      metadata: {
        modelUsed: true,
        fallbackUsed: false,
        rawText: result.rawText,
        finishReason: result.finishReason,
        usage: result.usage,
      },
    };
  } catch (caught) {
    return {
      status: "failed",
      metadata: {
        modelUsed: true,
        fallbackUsed: true,
        modelError: errorMetadata(caught),
      },
    };
  }
}

export function workflowModelFailureResult(
  workflowName: RuntimeV4WorkflowName,
  metadata: WorkflowModelMetadata,
): CreativeWorkflowResult {
  const modelError = metadata.modelError;
  const reason = modelError?.message
    ? `Model error: ${modelError.message}`
    : "The model did not return a usable structured response.";

  return {
    status: "failed",
    workflowName,
    error: {
      code: metadata.modelUsed ? "WORKFLOW_MODEL_GENERATION_FAILED" : "WORKFLOW_MODEL_UNAVAILABLE",
      message: `I couldn't generate ${workflowName} reliably, so I did not create artifacts or workspace changes. ${reason}`,
      recoverable: true,
      details: toJsonObject({ model: metadata }),
    },
  };
}
