import type { ModelProviderId } from "@/lib/ai/model-gateway/types";

export type ModelProfile = {
  id: string;
  provider: ModelProviderId;
  label: string;
  supportsStructured: boolean;
  supportsStreaming: boolean;
  serverOnly: boolean;
};

export const defaultAgentModelProvider: ModelProviderId = "gemini";
export const defaultAgentModel = "gemini-2.5-flash";

export const agentModelProfiles: Record<ModelProviderId, ModelProfile> = {
  gemini: {
    id: defaultAgentModel,
    provider: "gemini",
    label: "Gemini 2.5 Flash",
    supportsStructured: true,
    supportsStreaming: true,
    serverOnly: true,
  },
  fake: {
    id: "fake-model",
    provider: "fake",
    label: "Fake deterministic test model",
    supportsStructured: true,
    supportsStreaming: true,
    serverOnly: false,
  },
};

export function isModelProviderId(value: string | undefined): value is ModelProviderId {
  return value === "gemini" || value === "fake";
}

export function resolveModelProfile(input: {
  provider?: string;
  model?: string;
} = {}): ModelProfile {
  const provider = input.provider ?? process.env.AGENT_DEFAULT_MODEL_PROVIDER ?? defaultAgentModelProvider;
  if (!isModelProviderId(provider)) {
    return agentModelProfiles[defaultAgentModelProvider];
  }

  return {
    ...agentModelProfiles[provider],
    id: input.model ?? process.env.AGENT_DEFAULT_MODEL ?? agentModelProfiles[provider].id,
  };
}
