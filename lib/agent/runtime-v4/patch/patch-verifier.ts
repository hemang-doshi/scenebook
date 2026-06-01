import type { RuntimeV4Event } from "@/lib/agent/runtime-v4/events";
import type {
  ToolExecutionLike,
  ToolVerificationLike,
} from "@/lib/agent/runtime-v4/patch/patch-results";

export function isToolVerificationFailure(result: ToolExecutionLike) {
  return result.verification?.verified === false;
}

export function verificationMessage(verification: ToolVerificationLike) {
  if (typeof verification.message === "string" && verification.message.trim()) {
    return verification.message;
  }

  if (typeof verification.reason === "string" && verification.reason.trim()) {
    return verification.reason;
  }

  return verification.verified ? "Tool verification passed." : "Tool verification failed.";
}

export function toolVerificationEvent(input: {
  result: ToolExecutionLike;
  runId?: string;
  threadId?: string | null;
  operationIndex?: number;
  operationType?: string;
}): RuntimeV4Event | null {
  const verification = input.result.verification;
  if (!verification) {
    return null;
  }

  return {
    type: verification.verified ? "tool_verification_completed" : "tool_verification_failed",
    runId: input.runId,
    threadId: input.threadId ?? null,
    toolName: input.result.toolName,
    toolCallId: input.result.toolCallId,
    operationIndex: input.operationIndex,
    operationType: input.operationType,
    verification,
    message: verificationMessage(verification),
    error: verification.verified ? undefined : verificationMessage(verification),
  };
}
