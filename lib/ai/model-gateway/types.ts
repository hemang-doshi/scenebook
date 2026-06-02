import type { ModelMessage } from "ai";
import type { z } from "zod";

export type ModelProviderId = "google" | "nim" | "openrouter" | "fake";

export type ModelProfileName =
  | "agent_decision"
  | "creative_generation"
  | "structured_extraction"
  | "critique"
  | "final_response"
  | "test_fake";

export type ModelUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
  raw?: unknown;
};

export type GenerateTextInput = {
  profile: ModelProfileName;
  system?: string;
  prompt?: string;
  messages?: ModelMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
  metadata?: Record<string, unknown>;
};

export type GenerateTextResult = {
  text: string;
  usage?: ModelUsage;
  finishReason?: string;
  providerMetadata?: Record<string, unknown>;
  warnings?: unknown[];
};

export type GenerateStructuredInput<TOutput> = GenerateTextInput & {
  schema: z.ZodType<TOutput>;
  schemaName?: string;
  schemaDescription?: string;
};

export type GenerateStructuredResult<TOutput> = {
  object: TOutput;
  rawText?: string;
  usage?: ModelUsage;
  finishReason?: string;
};

export type StreamTextInput = GenerateTextInput;

export type StreamTextResult = {
  textStream: AsyncIterable<string>;
  usage?: Promise<ModelUsage | undefined>;
  finishReason?: Promise<string | undefined>;
};

export interface ModelGateway {
  provider?: ModelProviderId;
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
  generateStructured<TOutput>(
    input: GenerateStructuredInput<TOutput>,
  ): Promise<GenerateStructuredResult<TOutput>>;
  streamText(input: StreamTextInput): Promise<StreamTextResult>;
}

export type ModelGatewayTextRequest = GenerateTextInput;
export type ModelGatewayStructuredRequest<TOutput> = GenerateStructuredInput<TOutput>;

export type ResolvedModelProfile = {
  profile: ModelProfileName;
  provider: ModelProviderId;
  model: string;
  temperature: number;
  maxTokens: number;
  structured: boolean;
};

export {
  ModelConfigurationError,
  ModelGatewayConfigurationError,
  ModelGatewayResponseError,
  ModelInvocationError,
  ModelStructuredOutputError,
} from "@/lib/ai/model-gateway/errors";
