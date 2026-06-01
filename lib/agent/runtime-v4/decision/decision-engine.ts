import type { ModelGateway } from "@/lib/ai/model-gateway";
import { createRuntimeV4ModelGateway } from "@/lib/agent/runtime-v4/model";
import {
  createDecisionPrompt,
  createDeterministicSafetyDecision,
  createGracefulDecisionFallback,
  type DecisionEngineInput,
} from "@/lib/agent/runtime-v4/decision/intent";
import {
  parseAgentDecision,
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
    const response = await gateway.generateText(request);
    try {
      return parseAgentDecision(response);
    } catch (parseError) {
      const repaired = await repairAgentDecision({
        gateway,
        malformedResponse: response,
        parseError,
        originalPrompt: request.prompt,
        model: input.model,
      });
      return repaired ?? createGracefulDecisionFallback(input.message);
    }
  } catch {
    return createDeterministicSafetyDecision(input) ?? createGracefulDecisionFallback(input.message);
  }
}
