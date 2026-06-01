import type {
  ModelProfileName,
  ModelProviderId,
  ResolvedModelProfile,
} from "@/lib/ai/model-gateway/types";

type ModelProfileConfig = {
  provider: ModelProviderId | string;
  model: string;
  temperature: number;
  maxTokens: number;
  structured: boolean;
};

export const defaultAgentModelProvider: ModelProviderId = "google";
export const defaultAgentModel = "gemini-2.5-flash";
export const defaultNimBaseUrl = "https://integrate.api.nvidia.com/v1";

function env(name: string) {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

function normalizeProvider(provider: string | undefined): ModelProviderId {
  if (provider === "google" || provider === "gemini") return "google";
  if (provider === "nim") return "nim";
  if (provider === "fake") return "fake";
  return defaultAgentModelProvider;
}

function profileConfigs(): Record<ModelProfileName, ModelProfileConfig> {
  const defaultProvider = normalizeProvider(env("AGENT_DEFAULT_MODEL_PROVIDER"));
  const defaultModel = env("AGENT_DEFAULT_MODEL") ?? defaultAgentModel;

  return {
    agent_decision: {
      provider: defaultProvider,
      model: env("AGENT_DECISION_MODEL") ?? defaultModel,
      temperature: 0.1,
      maxTokens: 2000,
      structured: true,
    },
    structured_extraction: {
      provider: defaultProvider,
      model: env("AGENT_EXTRACTION_MODEL") ?? defaultModel,
      temperature: 0,
      maxTokens: 2000,
      structured: true,
    },
    creative_generation: {
      provider: normalizeProvider(env("AGENT_CREATIVE_PROVIDER")) || defaultProvider,
      model: env("AGENT_CREATIVE_MODEL") ?? defaultModel,
      temperature: 0.8,
      maxTokens: 5000,
      structured: false,
    },
    critique: {
      provider: normalizeProvider(env("AGENT_CRITIQUE_PROVIDER")) || defaultProvider,
      model: env("AGENT_CRITIQUE_MODEL") ?? defaultModel,
      temperature: 0.2,
      maxTokens: 3000,
      structured: true,
    },
    final_response: {
      provider: normalizeProvider(env("AGENT_FINAL_PROVIDER")) || defaultProvider,
      model: env("AGENT_FINAL_MODEL") ?? defaultModel,
      temperature: 0.4,
      maxTokens: 3000,
      structured: false,
    },
    test_fake: {
      provider: "fake",
      model: "fake-model",
      temperature: 0,
      maxTokens: 1000,
      structured: true,
    },
  };
}

export const MODEL_PROFILES = {
  agent_decision: {
    provider: "google",
    model: defaultAgentModel,
    temperature: 0.1,
    maxTokens: 2000,
    structured: true,
  },
  structured_extraction: {
    provider: "google",
    model: defaultAgentModel,
    temperature: 0,
    maxTokens: 2000,
    structured: true,
  },
  creative_generation: {
    provider: "google",
    model: defaultAgentModel,
    temperature: 0.8,
    maxTokens: 5000,
    structured: false,
  },
  critique: {
    provider: "google",
    model: defaultAgentModel,
    temperature: 0.2,
    maxTokens: 3000,
    structured: true,
  },
  final_response: {
    provider: "google",
    model: defaultAgentModel,
    temperature: 0.4,
    maxTokens: 3000,
    structured: false,
  },
  test_fake: {
    provider: "fake",
    model: "fake-model",
    temperature: 0,
    maxTokens: 1000,
    structured: true,
  },
} as const satisfies Record<ModelProfileName, ModelProfileConfig>;

export function isModelProfileName(value: string | undefined): value is ModelProfileName {
  return value === "agent_decision"
    || value === "creative_generation"
    || value === "structured_extraction"
    || value === "critique"
    || value === "final_response"
    || value === "test_fake";
}

export function isModelProviderId(value: string | undefined): value is ModelProviderId {
  return value === "google" || value === "nim" || value === "fake";
}

export function resolveModelProfile(input: {
  profile?: ModelProfileName;
  provider?: string;
  model?: string;
} = {}): ResolvedModelProfile {
  const selectedProfile = input.profile ?? "agent_decision";
  const envProfile = env("AGENT_MODEL_PROFILE");
  const effectiveProfile = envProfile === "test_fake" ? "test_fake" : selectedProfile;
  const base = profileConfigs()[effectiveProfile];
  const provider = input.provider ? normalizeProvider(input.provider) : normalizeProvider(base.provider);
  const model = input.model
    ?? (provider === "nim" ? env("AGENT_NIM_MODEL") : undefined)
    ?? base.model;

  return {
    profile: effectiveProfile,
    provider,
    model,
    temperature: base.temperature,
    maxTokens: base.maxTokens,
    structured: base.structured,
  };
}
