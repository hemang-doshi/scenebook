import type { z } from "zod";

import type { ModelGateway } from "@/lib/ai/model-gateway";
import {
  agentDecisionSchema,
  type AgentDecision,
} from "@/lib/agent/runtime-v4/decision/schemas";

export function extractFirstJsonObject(text: string) {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return JSON.parse(fencedMatch[1] ?? "{}");
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response did not include a JSON object.");
  }

  return JSON.parse(text.slice(start, end + 1));
}

export function parseStructuredJson<TOutput>(text: string, schema: z.ZodType<TOutput>): TOutput {
  return schema.parse(extractFirstJsonObject(text));
}

export function parseAgentDecision(text: string): AgentDecision {
  return parseStructuredJson(text, agentDecisionSchema);
}

export async function repairAgentDecision(input: {
  gateway: ModelGateway;
  malformedResponse: string;
  parseError: unknown;
  originalPrompt: string;
  model?: string;
}): Promise<AgentDecision | null> {
  const repaired = await input.gateway.generateText({
    model: input.model,
    systemInstruction: "Repair malformed SceneBook decision JSON. Return strict JSON only.",
    prompt: [
      "Repair this into a valid runtime-v4 AgentDecision JSON object.",
      "Allowed decision types: ask_question, propose_plan, tool_call, workflow_call, final_response, stop_with_error.",
      "If uncertain, return a helpful final_response.",
      `Parse error:\n${input.parseError instanceof Error ? input.parseError.message : String(input.parseError)}`,
      `Original decision prompt:\n${input.originalPrompt}`,
      `Malformed response:\n${input.malformedResponse}`,
    ].join("\n\n"),
  });

  try {
    return parseAgentDecision(repaired);
  } catch {
    return null;
  }
}
