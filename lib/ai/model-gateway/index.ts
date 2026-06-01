import { generateText as aiGenerateText, Output, streamText as aiStreamText } from "ai";
import type { LanguageModel } from "ai";

import {
  ModelConfigurationError,
  ModelInvocationError,
  ModelStructuredOutputError,
} from "@/lib/ai/model-gateway/errors";
import { resolveModelProfile } from "@/lib/ai/model-gateway/model-profiles";
import { createGoogleModel } from "@/lib/ai/model-gateway/providers/ai-sdk-google";
import { createNimModel } from "@/lib/ai/model-gateway/providers/ai-sdk-nim";
import { createFakeModelGateway, type FakeModelGatewayOptions } from "@/lib/ai/model-gateway/providers/fake";
import type {
  GenerateStructuredInput,
  GenerateTextInput,
  ModelGateway,
  ModelProviderId,
  ModelUsage,
  ResolvedModelProfile,
} from "@/lib/ai/model-gateway/types";

export * from "@/lib/ai/model-gateway/errors";
export * from "@/lib/ai/model-gateway/model-profiles";
export * from "@/lib/ai/model-gateway/types";
export { createGoogleModel } from "@/lib/ai/model-gateway/providers/ai-sdk-google";
export { createNimModel } from "@/lib/ai/model-gateway/providers/ai-sdk-nim";
export { createFakeModelGateway } from "@/lib/ai/model-gateway/providers/fake";

export type CreateModelGatewayOptions = {
  provider?: ModelProviderId | "gemini";
  model?: string;
  fake?: FakeModelGatewayOptions;
};

function numeric(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function normalizeUsage(usage: unknown): ModelUsage | undefined {
  if (!usage || typeof usage !== "object") {
    return undefined;
  }

  const record = usage as Record<string, unknown>;

  return {
    inputTokens: numeric(record.inputTokens ?? record.promptTokens),
    outputTokens: numeric(record.outputTokens ?? record.completionTokens),
    totalTokens: numeric(record.totalTokens),
    reasoningTokens: numeric(record.reasoningTokens),
    cachedInputTokens: numeric(record.cachedInputTokens),
    raw: usage,
  };
}

function normalizeProviderMetadata(metadata: unknown): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  return metadata as Record<string, unknown>;
}

function promptFor(input: GenerateTextInput) {
  if (input.messages?.length) {
    return { messages: input.messages };
  }

  return { prompt: input.prompt ?? "" };
}

function createProviderModel(profile: ResolvedModelProfile): LanguageModel {
  if (profile.provider === "google") {
    return createGoogleModel(profile.model);
  }

  if (profile.provider === "nim") {
    return createNimModel(profile.model);
  }

  throw new ModelConfigurationError({
    provider: profile.provider,
    profile: profile.profile,
    message: `Unsupported model provider: ${profile.provider}`,
    recoverable: true,
  });
}

function rawTextFrom(cause: unknown) {
  if (!cause || typeof cause !== "object") {
    return undefined;
  }

  const record = cause as Record<string, unknown>;
  return typeof record.text === "string" ? record.text : undefined;
}

export function createModelGateway(options: CreateModelGatewayOptions = {}): ModelGateway {
  const fakeGateway = createFakeModelGateway(options.fake);

  return {
    async generateText(input) {
      const profile = resolveModelProfile({
        profile: input.profile,
        provider: options.provider,
        model: input.model ?? options.model,
      });

      if (profile.provider === "fake") {
        return fakeGateway.generateText(input);
      }

      try {
        const result = await aiGenerateText({
          model: createProviderModel(profile),
          system: input.system,
          ...promptFor(input),
          temperature: input.temperature ?? profile.temperature,
          maxOutputTokens: input.maxTokens ?? profile.maxTokens,
        });

        return {
          text: result.text,
          usage: normalizeUsage(result.totalUsage ?? result.usage),
          finishReason: result.finishReason,
          providerMetadata: normalizeProviderMetadata(result.providerMetadata),
          warnings: result.warnings,
        };
      } catch (cause) {
        if (cause instanceof ModelConfigurationError) {
          throw cause;
        }

        throw new ModelInvocationError({
          provider: profile.provider,
          profile: profile.profile,
          message: `Failed to invoke ${profile.provider} model ${profile.model}.`,
          cause,
          recoverable: true,
        });
      }
    },
    async generateStructured<TOutput>(input: GenerateStructuredInput<TOutput>) {
      const profile = resolveModelProfile({
        profile: input.profile,
        provider: options.provider,
        model: input.model ?? options.model,
      });

      if (profile.provider === "fake") {
        return fakeGateway.generateStructured(input);
      }

      try {
        const result = await aiGenerateText({
          model: createProviderModel(profile),
          system: input.system,
          ...promptFor(input),
          temperature: input.temperature ?? profile.temperature,
          maxOutputTokens: input.maxTokens ?? profile.maxTokens,
          output: Output.object({
            schema: input.schema,
            name: input.schemaName,
            description: input.schemaDescription,
          }),
        });

        return {
          object: result.output,
          rawText: result.text,
          usage: normalizeUsage(result.totalUsage ?? result.usage),
          finishReason: result.finishReason,
        };
      } catch (cause) {
        if (cause instanceof ModelConfigurationError || cause instanceof ModelStructuredOutputError) {
          throw cause;
        }

        throw new ModelStructuredOutputError({
          provider: profile.provider,
          profile: profile.profile,
          schemaName: input.schemaName,
          message: `Failed to generate structured output for ${input.profile}.`,
          rawText: rawTextFrom(cause),
          cause,
          recoverable: true,
        });
      }
    },
    async streamText(input) {
      const profile = resolveModelProfile({
        profile: input.profile,
        provider: options.provider,
        model: input.model ?? options.model,
      });

      if (profile.provider === "fake") {
        return fakeGateway.streamText(input);
      }

      try {
        const result = aiStreamText({
          model: createProviderModel(profile),
          system: input.system,
          ...promptFor(input),
          temperature: input.temperature ?? profile.temperature,
          maxOutputTokens: input.maxTokens ?? profile.maxTokens,
        });

        return {
          textStream: result.textStream,
          usage: Promise.resolve(result.totalUsage).then(normalizeUsage),
          finishReason: Promise.resolve(result.finishReason).then((reason) => reason ?? undefined),
        };
      } catch (cause) {
        if (cause instanceof ModelConfigurationError) {
          throw cause;
        }

        throw new ModelInvocationError({
          provider: profile.provider,
          profile: profile.profile,
          message: `Failed to stream ${profile.provider} model ${profile.model}.`,
          cause,
          recoverable: true,
        });
      }
    },
  };
}

export function createDefaultModelGateway(): ModelGateway {
  return createModelGateway();
}
