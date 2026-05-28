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
import { extractCreativeBrief, type CreativeBrief } from "@/lib/agent/runtime-v2/creative-brief";
import { buildAgentPlan, type AgentPlan } from "@/lib/agent/runtime-v2/planner";
import { getToolByName as getRuntimeV2ToolByName } from "@/lib/agent/runtime-v2/tools/registry";
import type { AgentRuntimeToolResult } from "@/lib/agent/runtime-v2/tools/types";
import {
  assetAgentCommands,
  streamingAgentCommands,
  type AgentCommand,
  type AgentToolCallRecord,
} from "@/lib/agent/types";
import { getProjectWorkspace, updateCard } from "@/lib/data/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JsonValue } from "@/lib/types";

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

function isRuntimeV2Enabled() {
  return process.env.AGENT_RUNTIME_V2_ENABLED === "true";
}

function isNaturalLanguageScriptRequest(message: string) {
  return isNaturalLanguageScriptSaveRequest(message)
    || /\b(generate|draft|write|make|turn|create)\b[\s\S]*\bscript\b/i.test(message)
    || /\bscript\b[\s\S]*\b(generate|draft|write|make|turn|create)\b/i.test(message);
}

function isNaturalLanguageScriptSaveRequest(message: string) {
  return /\b(save|apply|update|persist|store)\b[\s\S]*\b(script|script lab|workspace)\b/i.test(message)
    || /\b(script|script lab|workspace)\b[\s\S]*\b(save|apply|update|persist|store)\b/i.test(message)
    || /\b(make|turn)\b[\s\S]*\b(into|to)\b[\s\S]*\b(reel|short|tiktok|video)?\s*script\b/i.test(message);
}

function scriptPromptFromMessage(message: string, parsedInput?: string | null) {
  return (parsedInput ?? message)
    .replace(/^\/script\b/i, "")
    .trim();
}

function isVagueScriptPrompt(prompt: string) {
  const normalized = prompt.trim();
  return normalized.length < 15 || /^write (me )?(a )?script\.?$/i.test(normalized);
}

function buildRuntimeV2ScriptBrief(prompt: string, project: Awaited<ReturnType<typeof getProjectWorkspace>>): CreativeBrief {
  const normalizedPrompt = prompt.replace(/\btalking-head\b/gi, "talking head");
  const extracted = extractCreativeBrief(normalizedPrompt);

  if (isVagueScriptPrompt(prompt)) {
    return extracted;
  }

  return {
    ...extracted,
    coreAngle: extracted.coreAngle ?? prompt,
    platform: extracted.platform ?? mapProjectPlatform(project?.platform),
    durationSeconds: extracted.durationSeconds ?? 30,
    format: extracted.format ?? mapProjectFormat(project?.format),
    tone: extracted.tone ?? "polished",
  };
}

function mapProjectPlatform(platform: string | undefined): CreativeBrief["platform"] | undefined {
  switch (platform) {
    case "instagram":
      return "Instagram";
    case "tiktok":
      return "TikTok";
    case "youtube":
      return "YouTube Shorts";
    case "linkedin":
      return "LinkedIn";
    case "x":
      return "X";
    default:
      return undefined;
  }
}

function mapProjectFormat(format: string | undefined): CreativeBrief["format"] | undefined {
  switch (format) {
    case "vlog":
      return "vlog";
    case "reel":
    case "short":
    case "tiktok":
      return "talking head";
    case "carousel":
    case "post":
      return "typography";
    default:
      return undefined;
  }
}

function jsonRecord(input: Record<string, unknown>): Record<string, JsonValue> {
  return Object.fromEntries(
    Object.entries(input)
      .map(([key, value]) => [key, jsonValue(value)] as const)
      .filter((entry): entry is readonly [string, JsonValue] => entry[1] !== undefined),
  );
}

function jsonValue(value: unknown): JsonValue | undefined {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map(jsonValue)
      .filter((item): item is JsonValue => item !== undefined);
  }

  if (isRecord(value)) {
    return jsonRecord(value);
  }

  return undefined;
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

async function createRuntimeV2ToolCall(input: {
  projectId: string;
  threadId: string;
  runId: string;
  toolName: string;
  requiresApproval: boolean;
  payload: Record<string, unknown>;
}) {
  return createAgentToolCall({
    projectId: input.projectId,
    threadId: input.threadId,
    runId: input.runId,
    toolName: input.toolName,
    command: "script",
    requiresApproval: input.requiresApproval,
    payload: jsonRecord(input.payload),
  });
}

function encodeRuntimeV2Plan(plan: AgentPlan) {
  return {
    intent: plan.intent,
    workflow: plan.workflow?.name ?? null,
    steps: plan.steps.map((step) => step.toolName),
    questions: plan.questions,
    missingCreativeFields: plan.missingCreativeFields,
  };
}

function summarizeRuntimeV2Script(input: {
  packageOutput: Record<string, any>;
  scriptLabOutput: Record<string, any>;
  critiqueOutput: Record<string, any>;
  statusOutput: Record<string, any>;
}) {
  const updatedFields = stringList(input.scriptLabOutput.updatedFields);
  const statusChanged = input.statusOutput.statusChanged === true;
  const nextAction = statusChanged
    ? "Review the saved script, then build the shoot pack."
    : "Review the saved script, then decide whether to move the project forward.";

  return [
    `Script package created: ${String(input.packageOutput.hook ?? "draft script package")}`,
    updatedFields.length > 0
      ? `Workspace fields changed: ${updatedFields.join(", ")}.`
      : "Workspace fields changed: none.",
    `Producer critique: strongest part - ${String(input.critiqueOutput.strongestPart ?? "")} weakest part - ${String(input.critiqueOutput.weakestPart ?? "")} suggested improvement - ${String(input.critiqueOutput.suggestedImprovement ?? "")}`,
    `Next best action: ${nextAction}`,
  ].join("\n");
}

function createRuntimeV2ScriptStream(input: {
  body: z.infer<typeof requestSchema>;
  projectId: string;
  threadId: string;
  runId: string;
  project: Awaited<ReturnType<typeof getProjectWorkspace>>;
  prompt: string;
  parsedSlashCommand?: string | null;
}) {
  const encoder = new TextEncoder();
  const creativeBrief = buildRuntimeV2ScriptBrief(input.prompt, input.project);
  const modeDecision = isVagueScriptPrompt(input.prompt)
    ? {
        mode: "ask" as const,
        confidence: 0.9,
        reason: "Script request is missing useful creative context.",
        shouldAskQuestion: true,
        shouldUseTools: false,
      }
    : {
        mode: "execute" as const,
        confidence: 0.9,
        reason: "User requested script generation and workspace update.",
        shouldAskQuestion: false,
        shouldUseTools: true,
        suggestedWorkflow: "script",
      };
  const plan = buildAgentPlan({
    modeDecision,
    workflow: "script",
    creativeBrief,
    rawUserMessage: input.body.message,
    project: input.project,
    parsedSlashCommand: input.parsedSlashCommand ?? null,
  });

  const stream = new ReadableStream({
    async start(controller) {
      let activeToolCallId: string | null = null;

      const emit = (type: string, payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(encodeSse(type, payload)));
      };

      const emitTool = (
        id: string,
        toolName: string,
        status: string,
        metadata: {
          requiresApproval: boolean;
          approvalPolicy: string;
          sideEffect: string;
          result?: AgentRuntimeToolResult<Record<string, JsonValue>>;
          errorMessage?: string;
        },
      ) => {
        emit("tool", {
          tool: {
            id,
            command: "script",
            status,
            toolName,
            requiresApproval: metadata.requiresApproval,
            approvalPolicy: metadata.approvalPolicy,
            sideEffect: metadata.sideEffect,
            errorMessage: metadata.errorMessage ?? null,
            result: metadata.result ?? null,
          },
        });
      };

      const runTool = async (toolName: string, payload: Record<string, unknown>) => {
        const tool = getRuntimeV2ToolByName(toolName);
        if (!tool) {
          throw new Error(`Runtime v2 tool not found: ${toolName}`);
        }

        const toolCall = await createRuntimeV2ToolCall({
          projectId: input.projectId,
          threadId: input.threadId,
          runId: input.runId,
          toolName: tool.displayName,
          requiresApproval: tool.approvalPolicy !== "auto",
          payload,
        });
        activeToolCallId = toolCall.id;
        const toolEventMetadata = {
          requiresApproval: tool.approvalPolicy !== "auto",
          approvalPolicy: tool.approvalPolicy,
          sideEffect: tool.sideEffect,
        };
        emitTool(toolCall.id, tool.displayName, "running", {
          ...toolEventMetadata,
          result: {
            message: "Running tool.",
            output: { kind: "tool_progress", activity: toolName },
          },
        });

        try {
          const parsedPayload = tool.inputSchema.parse(payload);
          const result = await tool.handler({
            projectId: input.projectId,
            threadId: input.threadId,
            runId: input.runId,
            toolCallId: toolCall.id,
            rawInput: input.body.message,
            project: input.project,
            selectedModel: input.body.models?.chat ?? null,
            selectedModels: input.body.models ?? null,
            emitProgress: async (activity) => {
              emitTool(toolCall.id, tool.displayName, "running", {
                ...toolEventMetadata,
                result: {
                  message: activity,
                  output: { kind: "tool_progress", activity },
                },
              });
            },
          }, parsedPayload) as AgentRuntimeToolResult<Record<string, JsonValue>>;

          await completeAgentToolCall(toolCall.id, result.output, "completed");
          activeToolCallId = null;
          emitTool(toolCall.id, tool.displayName, "completed", {
            ...toolEventMetadata,
            result,
          });
          return result;
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "Runtime v2 tool failed.";
          await Promise.resolve(failAgentToolCall(toolCall.id, message)).catch(() => null);
          activeToolCallId = null;
          emitTool(toolCall.id, tool.displayName, "failed", {
            ...toolEventMetadata,
            errorMessage: message,
          });
          throw caught;
        }
      };

      try {
        emit("meta", {
          threadId: input.threadId,
          runId: input.runId,
        });
        emit("plan", {
          plan: encodeRuntimeV2Plan(plan),
        });

        if (plan.intent === "ask_questions") {
          const message = [
            "Before I write this, I need a little more direction:",
            ...plan.questions.map((question, index) => `${index + 1}. ${question}`),
          ].join("\n");

          emit("chunk", { text: message });
          await appendAgentMessage({
            projectId: input.projectId,
            threadId: input.threadId,
            role: "assistant",
            content: message,
            model: input.body.models?.chat ?? null,
            provider: "agent-runtime-v2",
            metadata: {
              workflow: "script",
              plan: encodeRuntimeV2Plan(plan),
            },
          });
          await completeAgentRun(input.runId, {
            command: "script",
            respondedWith: "runtime-v2:script:questions",
          });
          controller.close();
          return;
        }

        const generateResult = await runTool("generate_script_package", {
          prompt: input.prompt,
          brief: jsonRecord(creativeBrief as Record<string, unknown>),
        });
        const packageOutput = generateResult.output as Record<string, any>;
        let critiqueResult: AgentRuntimeToolResult<Record<string, JsonValue>>;
        try {
          critiqueResult = await runTool("critique_script", {
            hook: packageOutput.hook,
            script: packageOutput.script,
            caption: packageOutput.caption,
            cta: packageOutput.cta,
            criteria: ["hook", "clarity", "retention", "cta"],
          });
        } catch {
          critiqueResult = {
            message: "Producer critique skipped.",
            output: {
              kind: "script_critique",
              strongestPart: "The generated script gives the project a concrete first draft.",
              weakestPart: "The critique step could not complete.",
              suggestedImprovement: "Review the hook and CTA manually before shooting.",
            },
          };
        }

        const scriptLabPatch = isRecord(packageOutput.scriptLabPatch)
          ? packageOutput.scriptLabPatch
          : {
              hook: packageOutput.hook,
              outline: stringList(packageOutput.outline).join("\n"),
              script: packageOutput.script,
              caption: packageOutput.caption,
              cta: packageOutput.cta,
              onScreenText: stringList(packageOutput.onScreenText).join("\n"),
            };

        const updateResult = await runTool("update_script_lab", scriptLabPatch);
        const artifactPayload = {
          kind: "script_package",
          hook: packageOutput.hook,
          outline: packageOutput.outline,
          script: packageOutput.script,
          caption: packageOutput.caption,
          cta: packageOutput.cta,
          onScreenText: packageOutput.onScreenText,
          critique: critiqueResult.output,
          sourcePrompt: input.prompt,
          model: input.body.models?.chat ?? null,
          workflow: "script",
        };
        await runTool("create_project_artifact", {
          title: typeof packageOutput.hook === "string" && packageOutput.hook.trim()
            ? packageOutput.hook.slice(0, 120)
            : "Script package",
          artifactType: "script_package",
          payload: artifactPayload,
          metadata: {
            workflow: "script",
            sourcePrompt: input.prompt,
          },
        });
        const statusResult = await runTool("update_project_status", {
          status: "scripted",
          reason: "script_generated",
        });

        const finalMessage = summarizeRuntimeV2Script({
          packageOutput,
          scriptLabOutput: updateResult.output as Record<string, any>,
          critiqueOutput: critiqueResult.output as Record<string, any>,
          statusOutput: statusResult.output as Record<string, any>,
        });

        emit("chunk", { text: finalMessage });
        await appendAgentMessage({
          projectId: input.projectId,
          threadId: input.threadId,
          role: "assistant",
          content: finalMessage,
          model: input.body.models?.chat ?? null,
          provider: "agent-runtime-v2",
          metadata: {
            workflow: "script",
            plan: encodeRuntimeV2Plan(plan),
          },
        });
        await completeAgentRun(input.runId, {
          command: "script",
          respondedWith: "runtime-v2:script",
        });
        controller.close();
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Unable to complete script workflow.";
        await Promise.resolve(failAgentRun(input.runId, message)).catch(() => null);
        if (activeToolCallId) {
          await Promise.resolve(failAgentToolCall(activeToolCallId, message)).catch(() => null);
        }
        emit("error", { error: message });
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
      if (isRuntimeV2Enabled() && effectiveCommand === "script" && !pendingCommand) {
        return createRuntimeV2ScriptStream({
          body,
          projectId,
          threadId,
          runId: runIdForResponse,
          project,
          prompt: scriptPromptFromMessage(body.message, parsed.input),
          parsedSlashCommand: "script",
        });
      }

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

    if (isRuntimeV2Enabled() && isNaturalLanguageScriptRequest(body.message)) {
      if (!isNaturalLanguageScriptSaveRequest(body.message)) {
        return createRuntimeV2ScriptStream({
          body,
          projectId,
          threadId,
          runId: runIdForResponse,
          project,
          prompt: "",
          parsedSlashCommand: null,
        });
      }

      return createRuntimeV2ScriptStream({
        body,
        projectId,
        threadId,
        runId: runIdForResponse,
        project,
        prompt: scriptPromptFromMessage(body.message),
        parsedSlashCommand: null,
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
