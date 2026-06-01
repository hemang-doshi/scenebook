import { resolveModelProfile } from "@/lib/ai/model-gateway/model-profiles";
import { createFakeModelGateway, type FakeModelGatewayOptions } from "@/lib/ai/model-gateway/providers/fake";
import { createGeminiModelGateway } from "@/lib/ai/model-gateway/providers/gemini";
import type { ModelGateway, ModelProviderId } from "@/lib/ai/model-gateway/types";

export * from "@/lib/ai/model-gateway/model-profiles";
export * from "@/lib/ai/model-gateway/types";
export { createFakeModelGateway } from "@/lib/ai/model-gateway/providers/fake";
export { createGeminiModelGateway } from "@/lib/ai/model-gateway/providers/gemini";

export type CreateModelGatewayOptions = {
  provider?: ModelProviderId;
  model?: string;
  gemini?: {
    apiKey?: string;
  };
  fake?: FakeModelGatewayOptions;
};

export function createModelGateway(options: CreateModelGatewayOptions = {}): ModelGateway {
  const profile = resolveModelProfile({
    provider: options.provider,
    model: options.model,
  });

  if (profile.provider === "fake") {
    return createFakeModelGateway(options.fake);
  }

  return createGeminiModelGateway({
    apiKey: options.gemini?.apiKey,
    model: profile.id,
  });
}

export function createDefaultModelGateway(): ModelGateway {
  return createModelGateway();
}
