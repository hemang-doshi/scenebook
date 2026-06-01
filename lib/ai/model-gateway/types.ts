import type { ZodType } from "zod";

export type ModelProviderId = "gemini" | "fake";

export type ModelGatewayTextRequest = {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  temperature?: number;
};

export type ModelGatewayStructuredRequest<TOutput> = ModelGatewayTextRequest & {
  schema: ZodType<TOutput>;
};

export interface ModelGateway {
  provider: ModelProviderId;
  generateText(request: ModelGatewayTextRequest): Promise<string>;
  generateStructured<TOutput>(request: ModelGatewayStructuredRequest<TOutput>): Promise<TOutput>;
  streamText(request: ModelGatewayTextRequest): AsyncIterable<string>;
}

export class ModelGatewayConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelGatewayConfigurationError";
  }
}

export class ModelGatewayResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelGatewayResponseError";
  }
}
