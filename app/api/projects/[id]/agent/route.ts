/* eslint-disable @typescript-eslint/no-explicit-any */
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
  getAgentToolCall,
  listAgentThreads,
} from "@/lib/agent/runtime";
import { createProjectArtifact } from "@/lib/agent/artifacts";
import { createMemorySnapshot } from "@/lib/agent/memory";
import { getAgentTool, listSupportedAgentCommands } from "@/lib/agent/tools/registry";
import {
  assetAgentCommands,
  streamingAgentCommands,
  type AgentCommand,
  type AgentToolCallRecord,
} from "@/lib/agent/types";
import { getProjectWorkspace, updateCard } from "@/lib/data/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  threadId: z.string().uuid().optional(),
  message: z.string().trim().min(1),
  models: z.record(z.string(), z.string()).optional(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        size: z.number(),
        url: z.string(),
      })
    )
    .optional(),
});

const streamingCommandSet = new Set<AgentCommand>(streamingAgentCommands);
const assetCommandSet = new Set<AgentCommand>(assetAgentCommands);
const AGENT_RUNTIME_SETUP_ERROR =
  "Agent runtime is not set up. Run the latest Supabase migrations.";

function encodeSse(type: string, payload: Record<string, unknown>) {
  return `data: ${JSON.stringify({ type, ...payload })}\n\n`;
}

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
    message.includes("project_artifacts") ||
    message.includes("relation") ||
    message.includes("schema cache")
  );
}

function createAgentRuntimeSetupResponse() {
  return NextResponse.json(
    {
      error: AGENT_RUNTIME_SETUP_ERROR,
      code: "agent_runtime_not_setup",
    },
    { status: 503 },
  );
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function artifactTitle(command: string | null | undefined, output: Record<string, any>) {
  if (typeof output.summary === "string" && output.summary.trim()) {
    return output.summary.trim().slice(0, 120);
  }
  if (typeof output.prompt === "string" && output.prompt.trim()) {
    return output.prompt.trim().slice(0, 120);
  }
  if (typeof output.hook === "string" && output.hook.trim()) {
    return output.hook.trim().slice(0, 120);
  }
  return command ? `/${command} artifact` : "Agent artifact";
}

async function persistArtifactForToolCall(toolCall: AgentToolCallRecord, output: Record<string, any>) {
  await createProjectArtifact({
    projectId: toolCall.project_id,
    threadId: toolCall.thread_id,
    toolCallId: toolCall.id,
    artifactType: typeof output.kind === "string" ? output.kind : toolCall.command ?? "agent_output",
    title: artifactTitle(toolCall.command, output),
    payload: output,
    metadata: {
      command: toolCall.command ?? null,
      toolName: toolCall.tool_name,
    },
  });
}

async function applyToolCallDraft(toolCallId: string, overrideOutput?: Record<string, any>) {
  const toolCall = await getAgentToolCall(toolCallId);
  const output = overrideOutput ?? toolCall.output ?? {};

  if (!isRecord(output)) {
    throw new Error("Tool output must be an object before it can be applied.");
  }

  switch (toolCall.command) {
    case "script": {
      const project = await getProjectWorkspace(toolCall.project_id);
      if (!project) {
        throw new Error("Project not found for script apply.");
      }

      await updateCard(toolCall.project_id, {
        scriptLab: {
          ...project.scriptLab,
          hook: typeof output.hook === "string" ? output.hook : project.scriptLab.hook,
          outline: stringList(output.outline).length > 0
            ? stringList(output.outline).join("\n")
            : project.scriptLab.outline,
          script: typeof output.script === "string" ? output.script : project.scriptLab.script,
          caption: typeof output.caption === "string" ? output.caption : project.scriptLab.caption,
          cta: typeof output.cta === "string" ? output.cta : project.scriptLab.cta,
          onScreenText: stringList(output.onScreenText).length > 0
            ? stringList(output.onScreenText).join("\n")
            : project.scriptLab.onScreenText,
        },
      });
      break;
    }
    case "tasks": {
      await createMemorySnapshot({
        projectId: toolCall.project_id,
        threadId: toolCall.thread_id,
        summary: typeof output.summary === "string" ? output.summary : "Updated production plan",
        metadata: {
          tasks: isRecord(output.tasks) ? output.tasks : {},
          ideas: stringList(output.ideas),
        },
      });
      break;
    }
    case "instagram": {
      await persistArtifactForToolCall(toolCall, output);
      const project = await getProjectWorkspace(toolCall.project_id);
      if (project && typeof output.caption === "string" && output.caption.trim()) {
        await updateCard(toolCall.project_id, {
          aiSuggestions: {
            ...project.aiSuggestions,
            captions: [output.caption, ...project.aiSuggestions.captions].slice(0, 8),
          },
        });
      }
      break;
    }
    case "analyze": {
      await persistArtifactForToolCall(toolCall, output);
      const project = await getProjectWorkspace(toolCall.project_id);
      if (project) {
        await updateCard(toolCall.project_id, {
          aiSuggestions: {
            ...project.aiSuggestions,
            performanceSummary:
              typeof output.summary === "string" ? output.summary : project.aiSuggestions.performanceSummary,
            followUps: stringList(output.next_steps).length > 0
              ? stringList(output.next_steps)
              : project.aiSuggestions.followUps,
          },
        });
      }
      break;
    }
    case "storyboard":
    case "form-json-prompt":
    case "import-to-editor":
    case "export":
      await persistArtifactForToolCall(toolCall, output);
      break;
    default:
      throw new Error("This tool output cannot be applied to the project.");
  }

  await completeAgentToolCall(toolCall.id, output, "approved");
  return { toolCall, output };
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
    const threadIdParam = url.searchParams.get("threadId");
    const selectedThreadId = threadIdParam
      ? z.string().uuid().parse(threadIdParam)
      : undefined;

    if (listThreads) {
      const threads = await listAgentThreads(projectId);
      return NextResponse.json({ threads });
    }

    const history = await getAgentHistory(projectId, selectedThreadId);

    return NextResponse.json({
      threadId: history.thread?.id ?? null,
      messages: history.messages,
      toolCalls: history.toolCalls,
    });
  } catch (caught) {
    if (isAgentPersistenceUnavailable(caught)) {
      return createAgentRuntimeSetupResponse();
    }

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
    let pendingCommand: AgentToolCallRecord | null = null;
    const thread = await createOrLoadThread(projectId, body.threadId);
    threadId = thread.id;

    if (!parsed.isCommand && body.threadId) {
      const history = await getAgentHistory(projectId, threadId);
      pendingCommand =
        [...history.toolCalls].reverse().find((toolCall) => toolCall.status === "awaiting_input") ?? null;
    }

    await appendAgentMessage({
      projectId,
      threadId,
      role: "user",
      content: body.message,
      model: body.models?.chat ?? null,
      metadata: {
        ...(parsed.command ? { command: parsed.command } : {}),
        ...(pendingCommand?.command ? { resumedCommand: pendingCommand.command } : {}),
        ...(body.attachments ? { attachments: body.attachments } : {}),
      },
    });

    const run = await createAgentRun({
      projectId,
      threadId,
      input: body.message,
      selectedModels: body.models,
      metadata: parsed.command
        ? { command: parsed.command }
        : pendingCommand?.command
          ? { command: pendingCommand.command, resumedToolCallId: pendingCommand.id }
          : {},
    });
    runId = run.id;
    runIdForResponse = run.id;

    const effectiveCommand = (parsed.command ?? pendingCommand?.command ?? null) as AgentCommand | null;

    if (effectiveCommand) {
      const tool = getAgentTool(effectiveCommand);

      if (!tool) {
        throw new Error(`Tool not found for /${effectiveCommand}.`);
      }

      const toolPrompt =
        pendingCommand && !parsed.command
          ? [
              `Original request: ${String((pendingCommand.output as Record<string, unknown>)?.original_prompt ?? "")}`,
              `Follow-up answers: ${body.message}`,
            ]
              .filter(Boolean)
              .join("\n")
          : parsed.input;

      const toolInput = tool.inputSchema.parse({ prompt: toolPrompt });
      let toolCallIdForResponse = pendingCommand?.id ?? `tool-call-${crypto.randomUUID()}`;

      if (pendingCommand) {
        await (supabase as any)
          .from("agent_tool_calls")
          .update({
            status: "running",
            error_message: null,
            completed_at: null,
          })
          .eq("id", pendingCommand.id)
          .eq("owner_id", user.id);
        toolCallId = pendingCommand.id;
      } else if (runId) {
        const toolCall = await createAgentToolCall({
          projectId,
          threadId,
          runId,
          toolName: tool.name,
          command: effectiveCommand,
          requiresApproval: tool.requiresApproval,
          payload: toolInput,
        });
        toolCallId = toolCall.id;
        toolCallIdForResponse = toolCall.id;
      }

      const toolContext = {
        projectId,
        threadId,
        runId: runId ?? `run-${crypto.randomUUID()}`,
        rawInput: body.message,
        project,
        selectedModel: body.models?.chat ?? null,
        selectedModels: body.models ?? null,
      };

      if (streamingCommandSet.has(effectiveCommand)) {
        const systemInstruction = buildAgentSystemInstruction({
          project,
          command: effectiveCommand,
        });
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            let accumulatedText = "";
            const emitToolEvent = (
              status: string,
              output: Record<string, unknown>,
              errorMessage?: string,
            ) => {
              controller.enqueue(
                encoder.encode(
                  encodeSse("tool", {
                    tool: {
                      id: toolCallIdForResponse,
                      command: effectiveCommand,
                      status,
                      toolName: tool.name,
                      requiresApproval: tool.requiresApproval,
                      errorMessage: errorMessage ?? null,
                      result: { output },
                    },
                  }),
                ),
              );
            };

            try {
              controller.enqueue(
                encoder.encode(
                  encodeSse("meta", {
                    threadId,
                    runId: runIdForResponse,
                  }),
                ),
              );
              emitToolEvent("running", { kind: "tool_progress", activity: "drafting" });

              const responseStream = generateTextStream({
                prompt: toolPrompt || body.message,
                systemInstruction,
                modelOverride: body.models?.chat,
              });

              for await (const chunk of responseStream) {
                accumulatedText += chunk;
                controller.enqueue(encoder.encode(encodeSse("chunk", { text: chunk })));
              }

              const toolResult = await tool.handler({
                ...toolContext,
                emitProgress: async (activity) => {
                  emitToolEvent("running", { kind: "tool_progress", activity });
                },
              }, toolInput);
              const toolStatus =
                toolResult.status ?? (tool.requiresApproval ? "awaiting_approval" : "completed");

              if (!accumulatedText.trim()) {
                accumulatedText = toolResult.message;
                controller.enqueue(encoder.encode(encodeSse("chunk", { text: accumulatedText })));
              }

              if (runId) {
                await appendAgentMessage({
                  projectId,
                  threadId,
                  role: "assistant",
                  content: accumulatedText,
                  model: body.models?.chat ?? null,
                  provider: "agent-runtime",
                  metadata: {
                    command: effectiveCommand,
                    toolName: tool.name,
                  },
                });
              }

              if (toolCallId) {
                await completeAgentToolCall(toolCallId, toolResult.output, toolStatus);
                toolCallId = null;
              }

              if (runId) {
                await completeAgentRun(runId, {
                  command: effectiveCommand,
                  respondedWith: `stream:${tool.command}`,
                });
              }

              controller.enqueue(
                encoder.encode(
                  encodeSse("tool", {
                    tool: {
                      id: toolCallIdForResponse,
                      command: effectiveCommand,
                      status: toolStatus,
                      toolName: tool.name,
                      requiresApproval: tool.requiresApproval,
                      result: toolResult,
                    },
                  }),
                ),
              );
              controller.close();
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "Unable to complete agent command stream.";
              if (runId) {
                await Promise.resolve(failAgentRun(runId, message)).catch(() => null);
              }
              if (toolCallId) {
                await Promise.resolve(failAgentToolCall(toolCallId, message)).catch(() => null);
                toolCallId = null;
              }
              emitToolEvent("failed", { kind: "tool_error", message }, message);
              controller.enqueue(encoder.encode(encodeSse("error", { error: message })));
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

      if (!assetCommandSet.has(effectiveCommand)) {
        throw new Error(`Tool not found for /${effectiveCommand}.`);
      }

      const toolResult = await tool.handler(
        toolContext,
        toolInput,
      );

      const toolStatus =
        toolResult.status ?? (tool.requiresApproval ? "awaiting_approval" : "completed");

      if (toolResult.saveAsAssistantMessage) {
        await appendAgentMessage({
          projectId,
          threadId,
          role: "assistant",
          content: toolResult.message,
          model: body.models?.chat ?? null,
          provider: "agent-tool",
          metadata: {
            command: effectiveCommand,
            toolName: tool.name,
            toolOutput: toolResult.output,
          },
        });
      }

      if (toolCallId) {
        await completeAgentToolCall(toolCallId, toolResult.output, toolStatus);
        toolCallId = null;
      }

      if (runId) {
        await completeAgentRun(runId, {
          command: effectiveCommand,
          respondedWith: `tool:${tool.command}`,
        });
      }

      return NextResponse.json({
        threadId,
        runId: runIdForResponse,
        message: toolResult.message,
        command: effectiveCommand,
        tool: {
          type: "tool_result",
          id: toolCallIdForResponse,
          command: effectiveCommand,
          status: toolStatus,
          toolName: tool.name,
          requiresApproval: tool.requiresApproval,
          result: toolResult,
        },
      });
    }

    const systemInstruction = buildAgentSystemInstruction({
      project,
      command: null,
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
          let sentText = "";

          const responseStream = generateTextStream({
            prompt: body.message,
            systemInstruction,
            modelOverride: body.models?.chat,
          });

          for await (const chunk of responseStream) {
            accumulatedText += chunk;
            const newText = accumulatedText.slice(sentText.length);
            if (newText) {
              sentText += newText;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "chunk",
                    text: newText,
                  })}\n\n`
                )
              );
            }
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
    if (isAgentPersistenceUnavailable(caught)) {
      return createAgentRuntimeSetupResponse();
    }

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

export async function PATCH(
  request: Request,
) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const { toolCallId, status, output, action } = z
      .object({
        toolCallId: z.string().uuid(),
        action: z.enum(["apply"]).optional(),
        status: z.enum(["completed", "failed", "rejected", "approved", "awaiting_approval", "awaiting_input"]).optional(),
        output: z.record(z.string(), z.any()).optional(),
      })
      .parse(await request.json());

    if (action === "apply") {
      const applied = await applyToolCallDraft(toolCallId, output);
      return NextResponse.json({
        success: true,
        status: "approved",
        toolCallId: applied.toolCall.id,
      });
    }

    if (!status) {
      return NextResponse.json({ error: "Missing status or apply action." }, { status: 400 });
    }

    const updatePayload: any = {
      status,
    };
    if (status === "completed" || status === "failed" || status === "rejected") {
      updatePayload.completed_at = new Date().toISOString();
    }
    if (status === "approved" || status === "completed") {
      updatePayload.approved_at = new Date().toISOString();
    }
    if (output) {
      updatePayload.output = output;
    }

    const { error } = await (supabase as any)
      .from("agent_tool_calls")
      .update(updatePayload)
      .eq("id", toolCallId)
      .eq("owner_id", user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (caught) {
    if (isAgentPersistenceUnavailable(caught)) {
      return createAgentRuntimeSetupResponse();
    }

    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "Unable to update tool call." },
      { status: 400 },
    );
  }
}
