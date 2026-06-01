import type { ModelGateway, ModelGatewayStructuredRequest } from "@/lib/ai/model-gateway/types";

export type FakeModelGatewayOptions = {
  text?: string;
  structured?: unknown;
  streamChunks?: string[];
};

export function createFakeModelGateway(options: FakeModelGatewayOptions = {}): ModelGateway {
  const text = options.text ?? "fake model response";
  const structured = options.structured ?? { ok: true };

  return {
    provider: "fake",
    async generateText() {
      return text;
    },
    async generateStructured<TOutput>(request: ModelGatewayStructuredRequest<TOutput>) {
      return request.schema.parse(structured);
    },
    async *streamText() {
      const chunks = options.streamChunks ?? [text];
      for (const chunk of chunks) {
        yield chunk;
      }
    },
  };
}
