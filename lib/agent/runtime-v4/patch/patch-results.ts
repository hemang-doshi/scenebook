import type { ProjectPatch, ProjectPatchOperation } from "@/lib/agent/runtime-v4/patch/project-patch";
import type { RuntimeV4Event } from "@/lib/agent/runtime-v4/events";
import type { ToolObservation } from "@/lib/agent/runtime-v3/types";
import type { AccountContext, PermissionSummary } from "@/lib/auth/account-context";
import type { JsonValue } from "@/lib/types";

export type PatchExecutionStatus =
  | "completed"
  | "partial_failed"
  | "failed"
  | "awaiting_approval";

export type PatchOperationExecutionStatus =
  | "running"
  | "completed"
  | "failed"
  | "blocked"
  | "awaiting_approval";

export type PatchExecutionContext = {
  userId: string;
  projectId: string;
  threadId?: string;
  runId?: string;
  source?: string;
  rawInput?: string;
  selectedModels?: Record<string, string>;
  account?: AccountContext;
  permissions?: PermissionSummary;
  metadata?: Record<string, JsonValue>;
};

export type ToolExecutionLikeError = {
  code?: string;
  message: string;
  recoverable?: boolean;
};

export type ToolVerificationLike = {
  verified: boolean;
  checkedAt?: string;
  message?: string;
  reason?: string;
  evidence?: unknown;
  actual?: unknown;
  [key: string]: unknown;
};

export type ToolExecutionLike = {
  toolName: string;
  status: "completed" | "failed" | "blocked" | "awaiting_approval";
  message?: string;
  output?: unknown;
  error?: ToolExecutionLikeError;
  verification?: ToolVerificationLike;
  policy?: unknown;
  toolCallId?: string;
  record?: unknown;
  startedAt?: string;
  completedAt?: string;
  [key: string]: unknown;
};

export type ProjectPatchOperationResult = {
  operationIndex: number;
  operation: ProjectPatchOperation;
  type: ProjectPatchOperation["type"];
  toolName: string;
  input: Record<string, unknown>;
  status: PatchOperationExecutionStatus;
  retryable: boolean;
  message: string;
  output?: unknown;
  error?: ToolExecutionLikeError;
  verification?: ToolVerificationLike;
  toolCallId?: string;
  startedAt?: string;
  completedAt?: string;
  toolResult?: ToolExecutionLike;
};

export type ProjectPatchExecutionResult = {
  status: PatchExecutionStatus;
  patch: ProjectPatch;
  operations: ProjectPatchOperationResult[];
  summary: string;
  successfulOperations: number;
  failedOperations: number;
  retryable: boolean;
  approvalRequired?: boolean;
  error?: ToolExecutionLikeError;
  events: RuntimeV4Event[];
};

function jsonRecord(value: unknown): Record<string, JsonValue> {
  try {
    const json = JSON.parse(JSON.stringify(value ?? null)) as JsonValue;
    if (json && typeof json === "object" && !Array.isArray(json)) {
      return json as Record<string, JsonValue>;
    }

    return { value: json };
  } catch {
    return { value: String(value) };
  }
}

export type GraphPatchExecutionResult =
  | ProjectPatchExecutionResult
  | (Omit<ProjectPatchExecutionResult, "patch"> & { patch?: ProjectPatchExecutionResult["patch"] });

export function projectPatchExecutionResultToObservation(
  result: GraphPatchExecutionResult,
): ToolObservation {
  const status = result.status === "completed"
    ? "completed"
    : result.status === "awaiting_approval"
      ? "awaiting_approval"
      : "failed";

  return {
    toolName: "project_patch",
    status,
    message: result.summary,
    output: jsonRecord({
      kind: "project_patch",
      patchTitle: result.patch?.title ?? "ProjectPatch",
      patchStatus: result.status,
      successfulOperations: result.successfulOperations,
      failedOperations: result.failedOperations,
      retryable: result.retryable,
      operations: result.operations.map((operation) => ({
        operationIndex: operation.operationIndex,
        type: operation.type,
        toolName: operation.toolName,
        status: operation.status,
        message: operation.message,
        retryable: operation.retryable,
        error: operation.error ?? null,
        verification: operation.verification ?? null,
        output: operation.output ?? null,
      })),
    }),
  };
}
