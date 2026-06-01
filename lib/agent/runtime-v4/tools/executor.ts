import { PolicyEngine } from "@/lib/agent/runtime-v4/policy/policy-engine";
import type {
  PolicyDecision,
  PolicyEngineLike,
  PolicySubject,
} from "@/lib/agent/runtime-v4/policy/policy-types";
import {
  createToolError,
  createZodToolError,
  normalizeToolError,
  TOOL_ERROR_CODES,
} from "@/lib/agent/runtime-v4/tools/errors";
import type {
  AgentTool,
  ToolExecutionPolicy,
  ToolExecutionRequest,
  ToolExecutionResult,
  ToolRegistryReader,
  ToolVerificationResult,
} from "@/lib/agent/runtime-v4/tools/types";
import type { JsonValue } from "@/lib/types";

export type ToolExecutorOptions = {
  registry: ToolRegistryReader;
  policyEngine?: PolicyEngineLike;
};

function now() {
  return new Date().toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function subjectFromTool(tool: AgentTool): PolicySubject {
  return {
    name: tool.name,
    displayName: tool.displayName,
    riskLevel: tool.riskLevel,
    sideEffect: tool.sideEffect,
    approvalPolicy: tool.approvalPolicy,
    availability: tool.availability,
  };
}

function executionPolicy(policy: PolicyDecision): ToolExecutionPolicy {
  if (policy.status === "allowed") {
    return { status: "allowed" };
  }

  return policy;
}

function normalizePolicyDecision(policy: PolicyDecision | { status: string }): PolicyDecision {
  if (policy.status === "allowed") {
    return { status: "allowed" };
  }

  if (policy.status === "requires_approval" && "reason" in policy && "approvalType" in policy) {
    return policy as PolicyDecision;
  }

  if (policy.status === "blocked" && "reason" in policy && "recoverable" in policy) {
    return policy as PolicyDecision;
  }

  return {
    status: "blocked",
    recoverable: false,
    reason: "Tool policy returned an invalid decision.",
  };
}

function result(input: Omit<ToolExecutionResult, "startedAt"> & { startedAt: string }): ToolExecutionResult {
  return input;
}

function completedTime() {
  return now();
}

function unavailableResult(input: {
  tool: AgentTool;
  startedAt: string;
  toolCallId?: string;
}): ToolExecutionResult {
  return result({
    toolName: input.tool.name,
    toolCallId: input.toolCallId,
    status: "blocked",
    startedAt: input.startedAt,
    completedAt: completedTime(),
    error: createToolError({
      code: TOOL_ERROR_CODES.UNAVAILABLE,
      message: `${input.tool.displayName} is ${input.tool.availability}.`,
      recoverable: false,
      details: { availability: input.tool.availability },
    }),
    policy: {
      status: "blocked",
      recoverable: false,
      reason: `${input.tool.displayName} is ${input.tool.availability}.`,
    },
  });
}

function normalizeVerification(verification: ToolVerificationResult): ToolVerificationResult {
  return {
    ...verification,
    checkedAt: verification.checkedAt ?? now(),
  };
}

function verificationMessage(verification: ToolVerificationResult) {
  return verification.reason ?? verification.message ?? "Tool verification failed.";
}

function failedVerificationFromError(caught: unknown) {
  const error = normalizeToolError(caught, {
    code: TOOL_ERROR_CODES.VERIFICATION_FAILED,
    message: "Tool verification failed.",
    recoverable: true,
  });

  return {
    error: {
      ...error,
      code: TOOL_ERROR_CODES.VERIFICATION_FAILED,
    },
    verification: normalizeVerification({
      verified: false,
      reason: error.message,
      message: error.message,
      evidence: error.details === undefined
        ? undefined
        : { error: error.details },
    }),
  };
}

function parseOutput(tool: AgentTool, rawOutput: unknown) {
  const direct = tool.outputSchema.safeParse(rawOutput);

  if (direct.success) {
    return {
      success: true as const,
      output: direct.data as Record<string, JsonValue>,
      message: undefined,
    };
  }

  if (isRecord(rawOutput) && "output" in rawOutput) {
    const wrapped = tool.outputSchema.safeParse(rawOutput.output);

    if (wrapped.success) {
      return {
        success: true as const,
        output: wrapped.data as Record<string, JsonValue>,
        message: typeof rawOutput.message === "string" ? rawOutput.message : undefined,
      };
    }

    return {
      success: false as const,
      error: wrapped.error,
    };
  }

  return {
    success: false as const,
    error: direct.error,
  };
}

export class ToolExecutor {
  private readonly registry: ToolRegistryReader;
  private readonly policyEngine: PolicyEngineLike;

  constructor(options: ToolExecutorOptions) {
    this.registry = options.registry;
    this.policyEngine = options.policyEngine ?? new PolicyEngine();
  }

  async execute(input: ToolExecutionRequest): Promise<ToolExecutionResult> {
    const startedAt = now();
    const toolCallId = input.context.toolCallId;
    const tool = this.registry.get(input.toolName);

    if (!tool) {
      return result({
        toolName: input.toolName,
        toolCallId,
        status: "blocked",
        startedAt,
        completedAt: completedTime(),
        error: createToolError({
          code: TOOL_ERROR_CODES.NOT_FOUND,
          message: `Unknown tool: ${input.toolName}.`,
          recoverable: false,
        }),
      });
    }

    if (tool.availability !== "available") {
      return unavailableResult({ tool, startedAt, toolCallId });
    }

    const parsedInput = tool.inputSchema.safeParse(input.input);
    if (!parsedInput.success) {
      return result({
        toolName: tool.name,
        toolCallId,
        status: "failed",
        startedAt,
        completedAt: completedTime(),
        error: createZodToolError({
          code: TOOL_ERROR_CODES.INPUT_INVALID,
          message: "Tool input did not match schema.",
          error: parsedInput.error,
        }),
      });
    }

    let policy: PolicyDecision;
    try {
      policy = normalizePolicyDecision(await this.policyEngine.check({
        subject: subjectFromTool(tool),
        context: input.context,
        input: parsedInput.data,
      }));
    } catch (caught) {
      return result({
        toolName: tool.name,
        toolCallId,
        status: "failed",
        startedAt,
        completedAt: completedTime(),
        error: normalizeToolError(caught, {
          code: TOOL_ERROR_CODES.POLICY_FAILED,
          message: "Tool policy check failed.",
          recoverable: true,
        }),
      });
    }

    const policySnapshot = executionPolicy(policy);

    if (policy.status === "blocked") {
      return result({
        toolName: tool.name,
        toolCallId,
        status: "blocked",
        startedAt,
        completedAt: completedTime(),
        error: createToolError({
          code: TOOL_ERROR_CODES.POLICY_BLOCKED,
          message: policy.reason,
          recoverable: policy.recoverable,
        }),
        policy: policySnapshot,
      });
    }

    if (policy.status === "requires_approval" && !input.force) {
      return result({
        toolName: tool.name,
        toolCallId,
        status: "awaiting_approval",
        startedAt,
        completedAt: completedTime(),
        message: policy.reason,
        policy: policySnapshot,
        approval: {
          type: policy.approvalType,
          reason: policy.reason,
          preview: policy.preview,
          requestedAt: completedTime(),
        },
      });
    }

    let handlerResult: unknown;
    try {
      handlerResult = await tool.handler(parsedInput.data as never, input.context);
    } catch (caught) {
      return result({
        toolName: tool.name,
        toolCallId,
        status: "failed",
        startedAt,
        completedAt: completedTime(),
        policy: policySnapshot,
        error: normalizeToolError(caught, {
          code: TOOL_ERROR_CODES.HANDLER_FAILED,
          message: `${tool.displayName} failed.`,
          recoverable: true,
        }),
      });
    }

    const output = parseOutput(tool, handlerResult);

    if (!output.success) {
      return result({
        toolName: tool.name,
        toolCallId,
        status: "failed",
        startedAt,
        completedAt: completedTime(),
        policy: policySnapshot,
        error: createZodToolError({
          code: TOOL_ERROR_CODES.OUTPUT_INVALID,
          message: "Tool output did not match schema.",
          error: output.error,
        }),
      });
    }

    let verification: ToolVerificationResult;
    try {
      verification = tool.verify
        ? normalizeVerification(await tool.verify(parsedInput.data as never, output.output, input.context))
        : normalizeVerification({ verified: true });
    } catch (caught) {
      const failed = failedVerificationFromError(caught);

      return result({
        toolName: tool.name,
        toolCallId,
        status: "failed",
        startedAt,
        completedAt: completedTime(),
        policy: policySnapshot,
        output: output.output,
        verification: failed.verification,
        error: failed.error,
      });
    }

    if (!verification.verified) {
      return result({
        toolName: tool.name,
        toolCallId,
        status: "failed",
        startedAt,
        completedAt: completedTime(),
        policy: policySnapshot,
        output: output.output,
        verification,
        error: createToolError({
          code: TOOL_ERROR_CODES.VERIFICATION_FAILED,
          message: verificationMessage(verification),
          recoverable: true,
        }),
      });
    }

    return result({
      toolName: tool.name,
      toolCallId,
      status: "completed",
      startedAt,
      completedAt: completedTime(),
      message: output.message,
      output: output.output,
      policy: policySnapshot,
      verification,
    });
  }
}
