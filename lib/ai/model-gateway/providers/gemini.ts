import { GoogleGenAI } from "@google/genai";

import {
  ModelGatewayConfigurationError,
  ModelGatewayResponseError,
  type ModelGateway,
  type ModelGatewayStructuredRequest,
  type ModelGatewayTextRequest,
} from "@/lib/ai/model-gateway/types";
import { defaultAgentModel } from "@/lib/ai/model-gateway/model-profiles";

type GeminiModelGatewayOptions = {
  apiKey?: string;
  model?: string;
};

type GeminiConfig = {
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
};

function requireApiKey(apiKey: string) {
  if (!apiKey.trim()) {
    throw new ModelGatewayConfigurationError(
      "Gemini model gateway is not configured. Set GEMINI_API_KEY on the server.",
    );
  }
}

function requireServerRuntime() {
  if (typeof window !== "undefined") {
    throw new ModelGatewayConfigurationError("Gemini model gateway can only be used on the server.");
  }
}

function configFor(request: ModelGatewayTextRequest, responseMimeType?: string): GeminiConfig | undefined {
  const config: GeminiConfig = {};
  if (request.systemInstruction) {
    config.systemInstruction = request.systemInstruction;
  }
  if (typeof request.temperature === "number") {
    config.temperature = request.temperature;
  }
  if (responseMimeType) {
    config.responseMimeType = responseMimeType;
  }

  return Object.keys(config).length > 0 ? config : undefined;
}

function extractJsonObject(text: string) {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return JSON.parse(fencedMatch[1] ?? "{}");
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new ModelGatewayResponseError("Model response did not include JSON.");
  }

  return JSON.parse(text.slice(start, end + 1));
}

export function createGeminiModelGateway(options: GeminiModelGatewayOptions = {}): ModelGateway {
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY ?? "";
  const defaultModel = options.model ?? process.env.AGENT_DEFAULT_MODEL ?? defaultAgentModel;
  let client: GoogleGenAI | null = null;

  function getClient() {
    requireApiKey(apiKey);
    requireServerRuntime();
    client ??= new GoogleGenAI({ apiKey });
    return client;
  }

  return {
    provider: "gemini",
    async generateText(request: ModelGatewayTextRequest) {
      const response = await getClient().models.generateContent({
        model: request.model ?? defaultModel,
        contents: request.prompt,
        config: configFor(request),
      });

      return response.text ?? "";
    },
    async generateStructured<TOutput>(request: ModelGatewayStructuredRequest<TOutput>) {
      const response = await getClient().models.generateContent({
        model: request.model ?? defaultModel,
        contents: [
          request.prompt,
          "Return strict JSON only. Do not include markdown, prose, or code fences.",
        ].join("\n\n"),
        config: configFor(request, "application/json"),
      });

      return request.schema.parse(extractJsonObject(response.text ?? ""));
    },
    async *streamText(request: ModelGatewayTextRequest) {
      const responseStream = await getClient().models.generateContentStream({
        model: request.model ?? defaultModel,
        contents: request.prompt,
        config: configFor(request),
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    },
  };
}
