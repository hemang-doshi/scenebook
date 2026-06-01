import {
  createModelGateway,
  type CreateModelGatewayOptions,
  type ModelGateway,
  type ModelGatewayStructuredRequest,
  type ModelGatewayTextRequest,
} from "@/lib/ai/model-gateway";

export type RuntimeV4ModelGatewayOptions = CreateModelGatewayOptions;

export function createRuntimeV4ModelGateway(options: RuntimeV4ModelGatewayOptions = {}): ModelGateway {
  return createModelGateway(options);
}

export async function generateRuntimeV4Text(
  request: ModelGatewayTextRequest,
  options: RuntimeV4ModelGatewayOptions = {},
) {
  return createRuntimeV4ModelGateway(options).generateText(request);
}

export async function generateRuntimeV4Structured<TOutput>(
  request: ModelGatewayStructuredRequest<TOutput>,
  options: RuntimeV4ModelGatewayOptions = {},
) {
  return createRuntimeV4ModelGateway(options).generateStructured(request);
}

export function streamRuntimeV4Text(
  request: ModelGatewayTextRequest,
  options: RuntimeV4ModelGatewayOptions = {},
) {
  return createRuntimeV4ModelGateway(options).streamText(request);
}
