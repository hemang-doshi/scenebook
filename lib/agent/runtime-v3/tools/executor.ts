/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  completeAgentToolCall,
  createAgentToolCall,
  failAgentToolCall,
  getAgentToolCall,
} from "@/lib/agent/runtime";
import { buildProjectSnapshot } from "@/lib/agent/runtime-v3/context/project-snapshot";
import { checkPolicy } from "@/lib/agent/runtime-v3/policy/policy-engine";
import { getRuntimeV3Tool } from "@/lib/agent/runtime-v3/tools/registry";
import type { AgentStream } from "@/lib/agent/runtime-v3/stream";
import type {
  PolicyResult,
  ProjectSnapshot,
  ToolContext,
  ToolObservation,
} from "@/lib/agent/runtime-v3/types";
import type { JsonValue } from "@/lib/types";

function jsonSafe(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? {})) as Record<string, JsonValue>;
}

function toolEventPayload(input: {
  id: string;
  toolName: string;
  displayName: string;
  status: string;
  requiresApproval: boolean;
  output?: Record<string, JsonValue>;
  errorMessage?: string | null;
}) {
  return {
    tool: {
      id: input.id,
      command: null,
      toolName: input.displayName,
      runtimeToolName: input.toolName,
      status: input.status,
      requiresApproval: input.requiresApproval,
      errorMessage: input.errorMessage ?? null,
      result: {
        output: input.output ?? {},
      },
    },
  };
}

function toolMetadata(tool: ReturnType<typeof getRuntimeV3Tool>, policy: PolicyResult) {
  if (!tool) {
    return {};
  }

  return {
    risk: policy.risk,
    approvalReason: policy.reason,
    availability: tool.availability,
    sideEffect: tool.sideEffect,
    approvalPolicy: tool.approvalPolicy,
  };
}

function verificationPayload(input: {
  verified: boolean;
  evidence?: Record<string, JsonValue>;
  message?: string | null;
}) {
  return {
    verified: input.verified,
    evidence: input.evidence ?? {},
    message: input.message ?? null,
  };
}

export async function executeRuntimeV3Tool(input: {
  toolName: string;
  rawInput: unknown;
  context: Omit<ToolContext, "toolCallId">;
  snapshot: ProjectSnapshot;
  stream: AgentStream;
  force?: boolean;
}): Promise<ToolObservation> {
  const tool = getRuntimeV3Tool(input.toolName);
  if (!tool) {
    return {
      toolName: input.toolName,
      status: "blocked",
      message: `Unknown tool: ${input.toolName}.`,
    };
  }

  let parsedInput: unknown;
  try {
    parsedInput = tool.inputSchema.parse(input.rawInput);
  } catch (caught) {
    return {
      toolName: tool.name,
      status: "failed",
      message: caught instanceof Error ? caught.message : "Tool input did not match schema.",
    };
  }

  const policy = checkPolicy({
    tool,
    toolInput: parsedInput,
    snapshot: input.snapshot,
  });
  const requiresApproval = policy.requiresApproval && !input.force;

  const toolCall = await createAgentToolCall({
    projectId: input.context.projectId,
    threadId: input.context.threadId,
    runId: input.context.runId,
    toolName: tool.name,
    command: null,
    requiresApproval,
    payload: jsonSafe(parsedInput),
    ...toolMetadata(tool, policy),
    verification: {
      verified: false,
      message: requiresApproval ? "Awaiting approval before execution." : "Execution has not completed yet.",
    },
  });

  input.stream.emit("tool_planned", {
    toolCallId: toolCall.id,
    toolName: tool.name,
    displayName: tool.displayName,
    sideEffect: tool.sideEffect,
    approvalPolicy: tool.approvalPolicy,
  });
  input.stream.emitLegacyTool(toolEventPayload({
    id: toolCall.id,
    toolName: tool.name,
    displayName: tool.displayName,
    status: "running",
    requiresApproval,
    output: {
      kind: "tool_progress",
      activity: "planned",
    },
  }) as any);

  if (!policy.allowed) {
    const output = {
      kind: "tool_blocked",
      reason: policy.reason,
      risk: policy.risk,
      verification: verificationPayload({
        verified: false,
        message: policy.reason,
      }),
    };
    await completeAgentToolCall(toolCall.id, output, "failed", {
      ...toolMetadata(tool, policy),
      verification: output.verification,
    });
    input.stream.emit("tool_failed", {
      toolCallId: toolCall.id,
      toolName: tool.name,
      error: policy.reason,
    });
    input.stream.emitLegacyTool(toolEventPayload({
      id: toolCall.id,
      toolName: tool.name,
      displayName: tool.displayName,
      status: "failed",
      requiresApproval,
      output,
      errorMessage: policy.reason,
    }) as any);
    return {
      toolName: tool.name,
      toolCallId: toolCall.id,
      status: "blocked",
      message: policy.reason,
      output,
      policy,
      record: toolCall,
    };
  }

  if (requiresApproval) {
    const output = {
      kind: "approval_request",
      risk: policy.risk,
      reason: policy.reason,
      preview: policy.preview ?? null,
      input: jsonSafe(parsedInput),
      verification: verificationPayload({
        verified: false,
        message: "Awaiting approval before execution.",
      }),
    };
    await completeAgentToolCall(toolCall.id, output, "awaiting_approval", {
      ...toolMetadata(tool, policy),
      verification: output.verification,
    });
    input.stream.emit("approval_required", {
      toolCallId: toolCall.id,
      toolName: tool.name,
      displayName: tool.displayName,
      risk: policy.risk,
      reason: policy.reason,
      preview: jsonSafe(policy.preview),
    });
    input.stream.emitLegacyTool(toolEventPayload({
      id: toolCall.id,
      toolName: tool.name,
      displayName: tool.displayName,
      status: "awaiting_approval",
      requiresApproval: true,
      output,
    }) as any);
    return {
      toolName: tool.name,
      toolCallId: toolCall.id,
      status: "awaiting_approval",
      message: policy.reason,
      output,
      policy,
      record: toolCall,
    };
  }

  input.stream.emit("tool_running", {
    toolCallId: toolCall.id,
    toolName: tool.name,
    displayName: tool.displayName,
  });
  input.stream.emitLegacyTool(toolEventPayload({
    id: toolCall.id,
    toolName: tool.name,
    displayName: tool.displayName,
    status: "running",
    requiresApproval: false,
    output: {
      kind: "tool_progress",
      activity: "running",
    },
  }) as any);

  try {
    const result = await tool.handler(
      {
        ...input.context,
        toolCallId: toolCall.id,
      },
      parsedInput as never,
    );
    const parsedOutput = tool.outputSchema.parse(result.output);
    const verification = tool.verify
      ? await tool.verify({ ...input.context, toolCallId: toolCall.id }, result)
      : { verified: tool.sideEffect === "none" ? true : true };

    if (tool.sideEffect !== "none" && !verification.verified) {
      throw new Error(verification.message ?? `${tool.displayName} could not verify persistence.`);
    }

    const output = {
      ...parsedOutput,
      verification: verificationPayload({
        verified: verification.verified,
        evidence: verification.evidence ?? {},
        message: verification.message ?? null,
      }),
    };

    await completeAgentToolCall(toolCall.id, output, "completed", {
      ...toolMetadata(tool, policy),
      verification: output.verification,
    });
    input.stream.emit("tool_completed", {
      toolCallId: toolCall.id,
      toolName: tool.name,
      displayName: tool.displayName,
      output: jsonSafe(output),
    });
    input.stream.emitLegacyTool(toolEventPayload({
      id: toolCall.id,
      toolName: tool.name,
      displayName: tool.displayName,
      status: "completed",
      requiresApproval: false,
      output,
    }) as any);

    return {
      toolName: tool.name,
      toolCallId: toolCall.id,
      status: "completed",
      message: result.message,
      output,
      policy,
      record: toolCall,
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : `${tool.displayName} failed.`;
    await failAgentToolCall(toolCall.id, message, {
      verification: verificationPayload({
        verified: false,
        message,
      }),
    }).catch(() => null);
    input.stream.emit("tool_failed", {
      toolCallId: toolCall.id,
      toolName: tool.name,
      displayName: tool.displayName,
      error: message,
    });
    input.stream.emitLegacyTool(toolEventPayload({
      id: toolCall.id,
      toolName: tool.name,
      displayName: tool.displayName,
      status: "failed",
      requiresApproval: false,
      output: {
        kind: "tool_error",
        message,
      },
      errorMessage: message,
    }) as any);

    return {
      toolName: tool.name,
      toolCallId: toolCall.id,
      status: "failed",
      message,
      output: {
        kind: "tool_error",
        message,
      },
      policy: policy as PolicyResult,
      record: toolCall,
    };
  }
}

export async function approveRuntimeV3ToolCall(input: {
  toolCallId: string;
  userId: string;
  selectedModels?: Record<string, string>;
}) {
  const toolCall = await getAgentToolCall(input.toolCallId);
  if (toolCall.status !== "awaiting_approval") {
    throw new Error("Only runtime-v3 tool calls awaiting approval can be approved.");
  }

  const tool = getRuntimeV3Tool(toolCall.tool_name);
  if (!tool) {
    throw new Error(`Unknown runtime-v3 tool: ${toolCall.tool_name}.`);
  }

  const parsedInput = tool.inputSchema.parse(toolCall.input ?? {});
  const snapshot = await buildProjectSnapshot({
    projectId: toolCall.project_id,
    threadId: toolCall.thread_id,
  });
  const policy = checkPolicy({
    tool,
    toolInput: parsedInput,
    snapshot,
  });

  if (!policy.allowed) {
    await failAgentToolCall(toolCall.id, policy.reason, {
      verification: verificationPayload({
        verified: false,
        message: policy.reason,
      }),
    }).catch(() => null);
    throw new Error(policy.reason);
  }

  try {
    const context = {
      projectId: toolCall.project_id,
      threadId: toolCall.thread_id,
      runId: toolCall.run_id,
      toolCallId: toolCall.id,
      userId: input.userId,
      rawInput: "",
      snapshot,
      selectedModels: input.selectedModels,
    };
    const result = await tool.handler(context, parsedInput as never);
    const parsedOutput = tool.outputSchema.parse(result.output);
    const verification = tool.verify
      ? await tool.verify(context, result)
      : { verified: true };

    if (tool.sideEffect !== "none" && !verification.verified) {
      throw new Error(verification.message ?? `${tool.displayName} could not verify persistence.`);
    }

    const output = {
      ...parsedOutput,
      verification: verificationPayload({
        verified: verification.verified,
        evidence: verification.evidence ?? {},
        message: verification.message ?? null,
      }),
    };

    await completeAgentToolCall(toolCall.id, output, "completed", {
      ...toolMetadata(tool, policy),
      verification: output.verification,
    });
    return {
      toolCall,
      output,
    };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : `${tool.displayName} failed.`;
    await failAgentToolCall(toolCall.id, message, {
      verification: verificationPayload({
        verified: false,
        message,
      }),
    }).catch(() => null);
    throw caught;
  }
}
