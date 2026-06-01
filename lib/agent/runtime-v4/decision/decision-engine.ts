import type { ModelGateway } from "@/lib/ai/model-gateway";
import { ModelStructuredOutputError } from "@/lib/ai/model-gateway/errors";
import { createRuntimeV4ModelGateway } from "@/lib/agent/runtime-v4/model";
import { generateAgentDecision } from "@/lib/agent/runtime-v4/model";
import {
  createDecisionPrompt,
  createDeterministicSafetyDecision,
  createGracefulDecisionFallback,
  type DecisionEngineInput,
} from "@/lib/agent/runtime-v4/decision/intent";
import {
  repairAgentDecision,
} from "@/lib/agent/runtime-v4/decision/repair";
import type { AgentDecision } from "@/lib/agent/runtime-v4/decision/schemas";

export type DecideNextStepInput = DecisionEngineInput & {
  modelGateway?: ModelGateway;
};

export async function decideNextStep(input: DecideNextStepInput): Promise<AgentDecision> {
  const gateway = input.modelGateway ?? createRuntimeV4ModelGateway({
    model: input.model,
  });
  const request = createDecisionPrompt(input);

  try {
    const response = await generateAgentDecision({
      prompt: request.prompt,
      system: request.system,
      model: input.model,
      modelGateway: gateway,
    });
    return response.object;
  } catch (caught) {
    if (caught instanceof ModelStructuredOutputError && caught.rawText) {
      const repaired = await repairAgentDecision({
        gateway,
        malformedResponse: caught.rawText,
        parseError: caught.cause ?? caught,
        originalPrompt: request.prompt,
        model: input.model,
      });
      return repaired ?? createGracefulDecisionFallback(input.message);
    }

    return createDeterministicSafetyDecision(input) ?? createGracefulDecisionFallback(input.message);
  }
}
