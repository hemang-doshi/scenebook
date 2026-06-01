import type { AgentEventType, AgentStreamEvent } from "@/lib/agent/runtime-v3/types";

function encodeSse(type: string, payload: Record<string, unknown>) {
  return `data: ${JSON.stringify({ type, ...payload })}\n\n`;
}

export class AgentStream {
  private readonly encoder = new TextEncoder();

  constructor(private readonly controller: ReadableStreamDefaultController<Uint8Array>) {}

  emit(type: AgentEventType, payload: Record<string, unknown> = {}) {
    this.controller.enqueue(this.encoder.encode(encodeSse(type, payload)));
  }

  emitLegacyChunk(text: string) {
    this.controller.enqueue(this.encoder.encode(encodeSse("chunk", { text })));
  }

  emitLegacyMeta(payload: Record<string, unknown>) {
    this.controller.enqueue(this.encoder.encode(encodeSse("meta", payload)));
  }

  emitLegacyTool(payload: Record<string, unknown>) {
    this.controller.enqueue(this.encoder.encode(encodeSse("tool", payload)));
  }

  close() {
    this.controller.close();
  }

  error(error: unknown) {
    this.controller.error(error);
  }
}

export function createAgentSseResponse(
  handler: (stream: AgentStream) => Promise<void>,
) {
  const stream = new ReadableStream({
    async start(controller) {
      const agentStream = new AgentStream(controller);
      try {
        await handler(agentStream);
        agentStream.close();
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Agent run failed.";
        const event: AgentStreamEvent = {
          type: "run_failed",
          error: message,
        };
        controller.enqueue(new TextEncoder().encode(encodeSse(event.type, event)));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
