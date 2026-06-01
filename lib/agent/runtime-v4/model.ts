import type { ModelMessage } from "ai";
import { z } from "zod";

import {
  createModelGateway,
  type CreateModelGatewayOptions,
  type GenerateStructuredInput,
  type GenerateTextInput,
  type ModelGateway,
  type StreamTextInput,
} from "@/lib/ai/model-gateway";
import {
  agentDecisionSchema,
  type AgentDecision,
} from "@/lib/agent/runtime-v4/decision/schemas";

export const intentUnderstandingSchema = z.object({
  intentType: z.enum([
    "create_reel",
    "revise_script",
    "workspace_update",
    "integration_request",
    "general_chat",
  ]),
  confidence: z.number().min(0).max(1),
  creativeMode: z.enum(["plan", "goal", "create", "review", "workspace"]).optional(),
  needsClarification: z.boolean(),
  clarificationQuestion: z.string().optional(),
  inferredGoal: z.string().optional(),
  requestedFormat: z.string().nullable().optional(),
  topic: z.string().nullable().optional(),
  needsWorkspaceMutation: z.boolean().optional(),
  summary: z.string().optional(),
});

export type IntentUnderstanding = z.infer<typeof intentUnderstandingSchema>;

export type RuntimeV4ModelGatewayOptions = CreateModelGatewayOptions;

type RuntimeV4ModelCallOptions = RuntimeV4ModelGatewayOptions & {
  modelGateway?: ModelGateway;
};

export function createRuntimeV4ModelGateway(options: RuntimeV4ModelGatewayOptions = {}): ModelGateway {
  return createModelGateway(options);
}

function gatewayFor(options: RuntimeV4ModelCallOptions = {}) {
  return options.modelGateway ?? createRuntimeV4ModelGateway(options);
}

export async function generateRuntimeV4Text(
  request: GenerateTextInput,
  options: RuntimeV4ModelCallOptions = {},
) {
  return gatewayFor(options).generateText(request);
}

export async function generateRuntimeV4Structured<TOutput>(
  request: GenerateStructuredInput<TOutput>,
  options: RuntimeV4ModelCallOptions = {},
) {
  return gatewayFor(options).generateStructured(request);
}

export function streamRuntimeV4Text(
  request: StreamTextInput,
  options: RuntimeV4ModelCallOptions = {},
) {
  return gatewayFor(options).streamText(request);
}

export async function generateIntentUnderstanding(input: {
  goal: string;
  projectTitle?: string | null;
  projectFormat?: string | null;
  model?: string;
  modelGateway?: ModelGateway;
}) {
  const prompt = [
    "Classify the user's SceneBook runtime intent.",
    "Return a compact object with intentType, confidence, creativeMode, needsClarification, and inferredGoal.",
    `Current project title:\n${input.projectTitle ?? ""}`,
    `Current project format:\n${input.projectFormat ?? ""}`,
    `User goal:\n${input.goal.trim()}`,
  ].join("\n\n");

  return gatewayFor(input).generateStructured({
    profile: "structured_extraction",
    schema: intentUnderstandingSchema,
    schemaName: "IntentUnderstanding",
    schemaDescription: "The user's current SceneBook runtime intent.",
    system: "You are SceneBook's runtime-v4 intent understanding model. Return validated structured output only.",
    prompt,
    model: input.model,
  });
}

export async function generateAgentDecision(input: {
  prompt: string;
  system?: string;
  messages?: ModelMessage[];
  model?: string;
  modelGateway?: ModelGateway;
}) {
  return gatewayFor(input).generateStructured<AgentDecision>({
    profile: "agent_decision",
    schema: agentDecisionSchema,
    schemaName: "AgentDecision",
    schemaDescription: "The next action the SceneBook agent should take.",
    system: input.system,
    prompt: input.messages?.length ? undefined : input.prompt,
    messages: input.messages,
    model: input.model,
  });
}

export async function generateFinalResponse(input: {
  prompt: string;
  system?: string;
  messages?: ModelMessage[];
  model?: string;
  modelGateway?: ModelGateway;
  metadata?: Record<string, unknown>;
}) {
  return gatewayFor(input).generateText({
    profile: "final_response",
    system: input.system,
    prompt: input.messages?.length ? undefined : input.prompt,
    messages: input.messages,
    model: input.model,
    metadata: input.metadata,
  });
}
