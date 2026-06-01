import type { PolicyResult, ToolObservation } from "@/lib/agent/runtime-v3/types";
import type { JsonValue } from "@/lib/types";
import type {
  ToolExecutionError,
  ToolExecutionPolicy,
  ToolExecutionResult,
  ToolVerificationResult,
} from "@/lib/agent/runtime-v4/tools/types";

function jsonSafe(value: unknown): JsonValue {
  if (value === undefined) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value)) as JsonValue;
  } catch {
    return String(value);
  }
}

function asRecord(value: unknown): Record<string, JsonValue> {
  const safe = jsonSafe(value);

  if (safe && typeof safe === "object" && !Array.isArray(safe)) {
    return safe as Record<string, JsonValue>;
  }

  return { value: safe };
}

function verificationPayload(verification?: ToolVerificationResult): Record<string, JsonValue> | undefined {
  if (!verification) {
    return undefined;
  }

  return asRecord({
    verified: verification.verified,
    checkedAt: verification.checkedAt ?? null,
    reason: verification.reason ?? verification.message ?? null,
    evidence: verification.evidence ?? {},
    expected: verification.expected ?? null,
    actual: verification.actual ?? null,
  });
}

function errorOutput(error: ToolExecutionError): Record<string, JsonValue> {
  return {
    kind: "tool_error",
    code: error.code,
    message: error.message,
    recoverable: error.recoverable,
    details: error.details ?? null,
  };
}

function outputForResult(result: ToolExecutionResult): Record<string, JsonValue> | undefined {
  const output = result.output ? asRecord(result.output) : undefined;
  const verification = verificationPayload(result.verification);

  if (result.error) {
    return {
      ...errorOutput(result.error),
      ...(verification ? { verification } : {}),
    };
  }

  if (result.status === "awaiting_approval") {
    return {
      kind: "approval_request",
      reason: result.approval?.reason ?? result.policy?.reason ?? "Approval required.",
      approvalType: result.approval?.type ?? result.policy?.approvalType ?? "policy",
      preview: result.approval?.preview ?? result.policy?.preview ?? {},
      ...(verification ? { verification } : {}),
    };
  }

  if (!output && !verification) {
    return undefined;
  }

  return {
    ...(output ?? {}),
    ...(verification ? { verification } : {}),
  };
}

function policyForObservation(policy?: ToolExecutionPolicy): PolicyResult | undefined {
  if (!policy) {
    return undefined;
  }

  return {
    allowed: policy.status !== "blocked",
    requiresApproval: policy.status === "requires_approval",
    risk: policy.status === "blocked" ? "blocked" : "medium",
    reason: policy.reason ?? "Tool policy evaluated.",
    preview: policy.preview,
  };
}

function messageForResult(result: ToolExecutionResult) {
  if (result.message) {
    return result.message;
  }

  if (result.error) {
    return result.error.message;
  }

  if (result.status === "awaiting_approval") {
    return result.approval?.reason ?? result.policy?.reason ?? "Approval required.";
  }

  return result.status === "completed"
    ? `${result.toolName} completed.`
    : `${result.toolName} ${result.status}.`;
}

export function toolExecutionResultToObservation(result: ToolExecutionResult): ToolObservation {
  return {
    toolName: result.toolName,
    toolCallId: result.toolCallId,
    status: result.status,
    message: messageForResult(result),
    output: outputForResult(result),
    policy: policyForObservation(result.policy),
  };
}

export const toToolObservation = toolExecutionResultToObservation;
export const toRuntimeV3ToolObservation = toolExecutionResultToObservation;
