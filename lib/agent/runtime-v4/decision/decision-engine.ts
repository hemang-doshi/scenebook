import type { ModelGateway } from "@/lib/ai/model-gateway";
import { ModelStructuredOutputError } from "@/lib/ai/model-gateway/errors";
import { createRuntimeV4ModelGateway } from "@/lib/agent/runtime-v4/model";
import { generateAgentDecision, generateFinalResponse } from "@/lib/agent/runtime-v4/model";
import {
  createDecisionPrompt,
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

function effectivePromptFor(input: DecisionEngineInput) {
  return input.effectivePrompt?.trim() || input.commandInput?.trim() || input.message.trim();
}

function isTransparentFailureDecision(decision: AgentDecision) {
  return decision.type === "final_response"
    && decision.confidence <= 0.35
    && /trouble generating a reliable|couldn't get a reliable model decision/i.test(decision.response);
}

function usefulFallbackText(text: string) {
  const trimmed = text.trim();
  if (trimmed.length < 20) return "";
  if (/^(still\s+)?not\s+json\.?$/i.test(trimmed)) return "";
  if (/^\{[\s\S]*\}$/.test(trimmed)) return "";
  return trimmed;
}

async function createConversationalFallbackDecision(input: DecisionEngineInput, gateway: ModelGateway): Promise<AgentDecision | null> {
  const fallback = await generateFinalResponse({
    model: input.model,
    modelGateway: gateway,
    system: [
      "You are SceneBook's conversational creative brain.",
      "Answer the user naturally and directly.",
      "If the user asks for creative work, generate useful creative output in chat now.",
      "Do not mention JSON, schemas, model decisioning, fallbacks, tools, or workflows.",
      "Do not claim workspace changes were saved or applied unless the prompt explicitly says they already were.",
      "You may briefly offer to save or stage the result after you have answered.",
    ].join(" "),
    prompt: [
      "Respond to this SceneBook user message as a creative partner.",
      `Raw user message:\n${input.message.trim()}`,
      `Effective prompt:\n${effectivePromptFor(input)}`,
      `Intent hint:\n${input.intentHint ?? "none"}`,
      `Command hint:\n${input.commandHint ?? "none"}`,
      `Project snapshot:\n${JSON.stringify(input.snapshot)}`,
      `Previous observations:\n${JSON.stringify(input.previousObservations ?? [])}`,
    ].join("\n\n"),
  });
  const response = usefulFallbackText(fallback.text);

  return response
    ? {
        type: "final_response",
        response,
        confidence: 0.55,
      }
    : null;
}

async function fallbackDecision(input: DecisionEngineInput, gateway: ModelGateway) {
  const local = createGracefulDecisionFallback(input);
  if (!isTransparentFailureDecision(local)) {
    return local;
  }

  return await createConversationalFallbackDecision(input, gateway).catch(() => null) ?? local;
}

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
      return repaired ?? await fallbackDecision(input, gateway);
    }

    return await fallbackDecision(input, gateway);
  }
}
