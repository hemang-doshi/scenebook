import { NextResponse } from "next/server";
import { z } from "zod";

import { generateTextStream } from "@/lib/ai/client";
import { buildAgentSystemInstruction } from "@/lib/agent/context-builder";
import { parseSlashCommand } from "@/lib/agent/command-parser";
import {
  appendAgentMessage,
  completeAgentToolCall,
  completeAgentRun,
  createAgentToolCall,
  createAgentRun,
  createOrLoadThread,
  failAgentToolCall,
  failAgentRun,
  getAgentHistory,
  listAgentThreads,
} from "@/lib/agent/runtime";
import { getAgentTool, listSupportedAgentCommands } from "@/lib/agent/tools/registry";
import { getProjectWorkspace } from "@/lib/data/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  threadId: z.string().uuid().optional(),
  message: z.string().trim().min(1),
  models: z.record(z.string(), z.string()).optional(),
});

function isAgentPersistenceUnavailable(error: unknown) {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
        ? error.message.toLowerCase()
        : "";

  return (
    message.includes("agent_threads") ||
    message.includes("agent_messages") ||
    message.includes("agent_runs") ||
    message.includes("agent_tool_calls") ||
    message.includes("relation") ||
    message.includes("schema cache")
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const { id: projectId } = await params;
    const url = new URL(request.url);
    const listThreads = url.searchParams.get("listThreads") === "true";
    const selectedThreadId = url.searchParams.get("threadId") || undefined;

    if (listThreads) {
      const threads = await listAgentThreads(projectId).catch((error) => {
        if (isAgentPersistenceUnavailable(error)) {
          return [];
        }
        throw error;
      });
      return NextResponse.json({ threads });
    }

    const history = await getAgentHistory(projectId, selectedThreadId).catch((error) => {
      if (isAgentPersistenceUnavailable(error)) {
        return {
          thread: null,
          messages: [],
          toolCalls: [],
        };
      }

      throw error;
    });

    return NextResponse.json({
      threadId: history.thread?.id ?? null,
      messages: history.messages,
      toolCalls: history.toolCalls,
    });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to load agent history." },
      { status: 400 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let runId: string | null = null;
  let toolCallId: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = requestSchema.parse(await request.json());
    const parsed = parseSlashCommand(body.message);

    if (body.message.trim().startsWith("/") && !parsed.isCommand) {
      return NextResponse.json(
        {
          error: `Unsupported slash command. Try one of: ${listSupportedAgentCommands().join(", ")}.`,
        },
        { status: 400 },
      );
    }

    const project = await getProjectWorkspace(projectId);
    let threadId = body.threadId ?? crypto.randomUUID();
    let runIdForResponse: string | null = null;

    try {
      const thread = await createOrLoadThread(projectId, body.threadId);
      threadId = thread.id;

      await appendAgentMessage({
        projectId,
        threadId,
        role: "user",
        content: body.message,
        model: body.models?.chat ?? null,
        metadata: parsed.command ? { command: parsed.command } : {},
      });

      const run = await createAgentRun({
        projectId,
        threadId,
        input: body.message,
        selectedModels: body.models,
        metadata: parsed.command ? { command: parsed.command } : {},
      });
      runId = run.id;
      runIdForResponse = run.id;
    } catch (error) {
      if (!isAgentPersistenceUnavailable(error)) {
        throw error;
      }
    }

    if (parsed.command) {
      const tool = getAgentTool(parsed.command);

      if (!tool) {
        throw new Error(`Tool not found for /${parsed.command}.`);
      }

      const toolInput = tool.inputSchema.parse({ prompt: parsed.input });
      let toolCallIdForResponse = `tool-call-${crypto.randomUUID()}`;

      if (runId) {
        const toolCall = await createAgentToolCall({
          projectId,
          threadId,
          runId,
          toolName: tool.name,
          command: parsed.command,
          requiresApproval: tool.requiresApproval,
          payload: toolInput,
        });
        toolCallId = toolCall.id;
        toolCallIdForResponse = toolCall.id;
      }

      const toolResult = await tool.handler(
        {
          projectId,
          threadId,
          runId: runId ?? `run-${crypto.randomUUID()}`,
          rawInput: body.message,
          project,
          selectedModel: body.models?.chat ?? null,
          selectedModels: body.models ?? null,
        },
        toolInput,
      );

      if (toolResult.saveAsAssistantMessage) {
        if (runId) {
          await appendAgentMessage({
            projectId,
            threadId,
            role: "assistant",
            content: toolResult.message,
            model: body.models?.chat ?? null,
            provider: "agent-tool",
            metadata: {
              command: parsed.command,
              toolName: tool.name,
              toolOutput: toolResult.output,
            },
          });
        }
      }

      if (toolCallId) {
        await completeAgentToolCall(toolCallId, toolResult.output, tool.requiresApproval);
        toolCallId = null;
      }

      if (runId) {
        await completeAgentRun(runId, {
          command: parsed.command,
          respondedWith: `tool:${tool.command}`,
        });
      }

      return NextResponse.json({
        threadId,
        runId: runIdForResponse,
        message: toolResult.message,
        command: parsed.command,
        tool: {
          type: "tool_result",
          id: toolCallIdForResponse,
          command: parsed.command,
          status: tool.requiresApproval ? "awaiting_approval" : "completed",
          toolName: tool.name,
          requiresApproval: tool.requiresApproval,
          result: toolResult,
        },
      });
    }

    const systemInstruction = buildAgentSystemInstruction({
      project,
      command: parsed.command,
    });

    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "meta",
                threadId,
                runId: runIdForResponse,
              })}\n\n`
            )
          );

          let accumulatedText = "";
          const responseStream = generateTextStream({
            prompt: parsed.input || body.message,
            systemInstruction,
            modelOverride: body.models?.chat,
          });

          for await (const chunk of responseStream) {
            accumulatedText += chunk;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "chunk",
                  text: chunk,
                })}\n\n`
              )
            );
          }

          if (runId) {
            await appendAgentMessage({
              projectId,
              threadId,
              role: "assistant",
              content: accumulatedText,
              model: body.models?.chat ?? null,
              provider: "agent-runtime",
              metadata: {},
            });
            await completeAgentRun(runId, {
              command: null,
              respondedWith: "generateTextStream",
            });
          }

          controller.close();
        } catch (err) {
          if (runId) {
            try {
              await failAgentRun(
                runId,
                err instanceof Error ? err.message : "Unable to complete agent run stream."
              );
            } catch {
              // Ignore failure write errors
            }
          }
          controller.error(err);
        }
      },
    });

    return new Response(customStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (caught) {
    if (toolCallId) {
      try {
        await failAgentToolCall(
          toolCallId,
          caught instanceof Error ? caught.message : "Unable to complete agent tool call.",
        );
      } catch {
        // Preserve the original route failure.
      }
    }

    if (runId) {
      try {
        await failAgentRun(
          runId,
          caught instanceof Error ? caught.message : "Unable to complete agent run.",
        );
      } catch {
        // Preserve the original route failure.
      }
    }

    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to complete agent run." },
      { status: 400 },
    );
  }
}
