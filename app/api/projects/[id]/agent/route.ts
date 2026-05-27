import { NextResponse } from "next/server";
import { z } from "zod";

import { generateText } from "@/lib/ai/client";
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
} from "@/lib/agent/runtime";
import { getAgentTool, listSupportedAgentCommands } from "@/lib/agent/tools/registry";
import { getProjectWorkspace } from "@/lib/data/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  threadId: z.string().uuid().optional(),
  message: z.string().trim().min(1),
  models: z.record(z.string(), z.string()).optional(),
});

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

    const thread = await createOrLoadThread(projectId, body.threadId);

    await appendAgentMessage({
      projectId,
      threadId: thread.id,
      role: "user",
      content: body.message,
      model: body.models?.chat ?? null,
      metadata: parsed.command ? { command: parsed.command } : {},
    });

    const run = await createAgentRun({
      projectId,
      threadId: thread.id,
      input: body.message,
      selectedModels: body.models,
      metadata: parsed.command ? { command: parsed.command } : {},
    });
    runId = run.id;

    const project = await getProjectWorkspace(projectId);

    if (parsed.command) {
      const tool = getAgentTool(parsed.command);

      if (!tool) {
        throw new Error(`Tool not found for /${parsed.command}.`);
      }

      const toolInput = tool.inputSchema.parse({ prompt: parsed.input });
      const toolCall = await createAgentToolCall({
        projectId,
        threadId: thread.id,
        runId: run.id,
        toolName: tool.name,
        command: parsed.command,
        requiresApproval: tool.requiresApproval,
        payload: toolInput,
      });
      toolCallId = toolCall.id;

      const toolResult = await tool.handler(
        {
          projectId,
          threadId: thread.id,
          runId: run.id,
          rawInput: body.message,
          project,
          selectedModel: body.models?.chat ?? null,
        },
        toolInput,
      );

      if (toolResult.saveAsAssistantMessage) {
        await appendAgentMessage({
          projectId,
          threadId: thread.id,
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

      await completeAgentToolCall(toolCall.id, toolResult.output, tool.requiresApproval);
      toolCallId = null;

      await completeAgentRun(run.id, {
        command: parsed.command,
        respondedWith: `tool:${tool.command}`,
      });

      return NextResponse.json({
        threadId: thread.id,
        runId: run.id,
        message: toolResult.message,
        command: parsed.command,
        tool: {
          type: "tool_result",
          toolName: tool.name,
          requiresApproval: tool.requiresApproval,
          result: toolResult,
        },
      });
    }

    const assistantText = await generateText({
      prompt: parsed.input || body.message,
      systemInstruction: buildAgentSystemInstruction({
        project,
        command: parsed.command,
      }),
      modelOverride: body.models?.chat,
    });

    await appendAgentMessage({
      projectId,
      threadId: thread.id,
      role: "assistant",
      content: assistantText,
      model: body.models?.chat ?? null,
      provider: "agent-runtime",
      metadata: parsed.command ? { command: parsed.command } : {},
    });

    await completeAgentRun(run.id, {
      command: parsed.command,
      respondedWith: "generateText",
    });

    return NextResponse.json({
      threadId: thread.id,
      runId: run.id,
      message: assistantText,
      command: parsed.command,
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
