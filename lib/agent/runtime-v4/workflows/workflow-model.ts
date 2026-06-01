import type { ModelProfileName, ModelUsage } from "@/lib/ai/model-gateway";
import type { CreativeWorkflowContext } from "@/lib/agent/runtime-v4/workflows/types";
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

export async function generateWorkflowStructured<TOutput>(input: {
  workflowName: string;
  profile?: ModelProfileName;
  schema: z.ZodType<TOutput>;
  schemaName: string;
  schemaDescription?: string;
  system: string;
  prompt: string;
  context: CreativeWorkflowContext;
  fallback: () => TOutput;
}): Promise<{ output: TOutput; metadata: WorkflowModelMetadata }> {
  const gateway = input.context.modelGateway;

  if (!gateway) {
    return {
      output: input.fallback(),
      metadata: { modelUsed: false, fallbackUsed: true },
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
    const error = caught instanceof Error
      ? { name: caught.name, message: caught.message }
      : { name: "UnknownError", message: String(caught) };

    return {
      output: input.fallback(),
      metadata: {
        modelUsed: true,
        fallbackUsed: true,
        modelError: error,
      },
    };
  }
}
