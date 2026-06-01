import { ModelStructuredOutputError } from "@/lib/ai/model-gateway/errors";
import type {
  GenerateStructuredInput,
  ModelGateway,
  ModelProfileName,
  ModelUsage,
} from "@/lib/ai/model-gateway/types";

export type FakeModelGatewayOptions = {
  text?: string;
  structured?: unknown;
  streamChunks?: Partial<Record<ModelProfileName, string[]>>;
  textResponses?: Partial<Record<ModelProfileName, string>>;
  structuredResponses?: Partial<Record<ModelProfileName, unknown>>;
  malformedStructuredProfiles?: ModelProfileName[];
};

type FakeStructuredDefaults = Partial<Record<ModelProfileName, unknown>>;

const fakeUsage: ModelUsage = {
  inputTokens: 1,
  outputTokens: 1,
  totalTokens: 2,
};

const defaultStructuredResponses: FakeStructuredDefaults = {
  structured_extraction: {
    intentType: "create_reel",
    confidence: 0.86,
    creativeMode: "plan",
    needsClarification: false,
    inferredGoal: "Help make a reel about building SceneBook",
  },
  agent_decision: {
    type: "propose_plan",
    plan: {
      title: "Fake SceneBook reel plan",
      steps: [
        {
          label: "Shape the hook around the SceneBook build moment.",
          sideEffect: "none",
        },
        {
          label: "Outline the setup, process, and payoff beats.",
          sideEffect: "none",
        },
      ],
    },
    reason: "Fake provider returns a deterministic no-write plan.",
  },
  critique: {
    status: "continue",
    reason: "Fake provider keeps the runtime moving unless a test overrides it.",
  },
  test_fake: {
    ok: true,
  },
};

function structuredFor<TOutput>(
  input: GenerateStructuredInput<TOutput>,
  options: FakeModelGatewayOptions,
) {
  return options.structuredResponses?.[input.profile]
    ?? options.structured
    ?? defaultStructuredResponses[input.profile]
    ?? {};
}

function textFor(profile: ModelProfileName, options: FakeModelGatewayOptions) {
  return options.textResponses?.[profile]
    ?? options.text
    ?? "fake model response";
}

export function createFakeModelGateway(options: FakeModelGatewayOptions = {}): ModelGateway {
  const malformedProfiles = new Set(options.malformedStructuredProfiles ?? []);

  return {
    provider: "fake",
    async generateText(input) {
      return {
        text: textFor(input.profile, options),
        usage: fakeUsage,
        finishReason: "stop",
        providerMetadata: {
          provider: "fake",
          profile: input.profile,
        },
      };
    },
    async generateStructured<TOutput>(input: GenerateStructuredInput<TOutput>) {
      if (malformedProfiles.has(input.profile)) {
        throw new ModelStructuredOutputError({
          provider: "fake",
          profile: input.profile,
          schemaName: input.schemaName,
          message: "Fake provider returned malformed structured output.",
          rawText: "not json",
          recoverable: true,
        });
      }

      const rawObject = structuredFor(input, options);

      try {
        return {
          object: input.schema.parse(rawObject),
          rawText: JSON.stringify(rawObject),
          usage: fakeUsage,
          finishReason: "stop",
        };
      } catch (cause) {
        throw new ModelStructuredOutputError({
          provider: "fake",
          profile: input.profile,
          schemaName: input.schemaName,
          message: "Fake provider structured output failed schema validation.",
          rawText: JSON.stringify(rawObject),
          cause,
          recoverable: true,
        });
      }
    },
    async streamText(input) {
      const chunks = options.streamChunks?.[input.profile] ?? [textFor(input.profile, options)];

      return {
        textStream: (async function* stream() {
          for (const chunk of chunks) {
            yield chunk;
          }
        })(),
        usage: Promise.resolve(fakeUsage),
        finishReason: Promise.resolve("stop"),
      };
    },
  };
}
