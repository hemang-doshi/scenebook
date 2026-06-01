import { randomUUID } from "node:crypto";

import { ZodError } from "zod";

import { errorFromUnknown, ProjectPatchValidationError } from "@/lib/agent/runtime-v4/patch/errors";
import {
  mapProjectPatchOperationToToolName,
  projectPatchSchema,
  type ProjectPatch,
  type ProjectPatchOperation,
} from "@/lib/agent/runtime-v4/patch/project-patch";
import {
  type PatchExecutionContext,
  type PatchExecutionStatus,
  type PatchOperationExecutionStatus,
  type ProjectPatchExecutionResult,
  type ProjectPatchOperationResult,
  type ToolExecutionLike,
} from "@/lib/agent/runtime-v4/patch/patch-results";
import { toolVerificationEvent } from "@/lib/agent/runtime-v4/patch/patch-verifier";
import type { RuntimeV4Event } from "@/lib/agent/runtime-v4/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JsonValue } from "@/lib/types";

export type PlannedPatchRecordStatus = "planned" | "awaiting_approval";

export type PlannedPatchRecord = {
  patchId: string;
  status: PlannedPatchRecordStatus;
};

export const plannedWorkflowPatchMarker = "runtime-v4-workflow";

export class SupabasePatchAuditError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "SupabasePatchAuditError";
    this.cause = options?.cause;
  }
}

export type ToolExecutorLike = {
  execute(input: {
    toolName: string;
    input: unknown;
    context: PatchExecutionContext;
  }): Promise<ToolExecutionLike> | ToolExecutionLike;
};

export type PatchAuditStore = {
  recordPlannedPatch?(input: {
    patch: ProjectPatch;
    context: PatchExecutionContext;
    reason?: string;
    metadata?: Record<string, JsonValue>;
  }): Promise<PlannedPatchRecord> | PlannedPatchRecord;
  recordPatchStarted?(input: {
    patch: ProjectPatch;
    context: PatchExecutionContext;
  }): Promise<void> | void;
  recordPatchCompleted?(input: {
    patch: ProjectPatch;
    context: PatchExecutionContext;
    result: ProjectPatchExecutionResult;
  }): Promise<void> | void;
  recordOperation?(input: {
    patch: ProjectPatch;
    context: PatchExecutionContext;
    operation: ProjectPatchOperationResult;
  }): Promise<void> | void;
};

export type PatchExecutorOptions = {
  toolExecutor: ToolExecutorLike;
  auditStore?: PatchAuditStore;
  requireAudit?: boolean;
};

type SupabaseMutationResult = {
  error?: unknown;
};

type SupabasePatchAuditClient = {
  from(table: string): {
    upsert(payload: Record<string, unknown>, options?: { onConflict?: string }): PromiseLike<SupabaseMutationResult>;
    update(payload: Record<string, unknown>): {
      eq(column: string, value: string): PromiseLike<SupabaseMutationResult>;
    };
  };
};

function jsonObject(value: unknown): Record<string, JsonValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, JsonValue>;
  } catch {
    return {};
  }
}

function nullable(value: string | undefined) {
  return value ?? null;
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return fallback;
}

function assertMutationSucceeded(result: SupabaseMutationResult, fallback: string) {
  if (!result.error) {
    return;
  }

  throw new SupabasePatchAuditError(errorMessage(result.error, fallback), {
    cause: result.error,
  });
}

function plannedPatchStatus(patch: ProjectPatch): PlannedPatchRecordStatus {
  return patch.requiresApproval || patch.riskLevel === "blocked" ? "awaiting_approval" : "planned";
}

export class SupabasePatchAuditStore implements PatchAuditStore {
  private readonly patchIds = new WeakMap<ProjectPatch, string>();

  private patchId(patch: ProjectPatch) {
    const existing = this.patchIds.get(patch);
    if (existing) {
      return existing;
    }

    const id = patch.id ?? randomUUID();
    this.patchIds.set(patch, id);
    return id;
  }

  private async client(): Promise<SupabasePatchAuditClient> {
    return (await createSupabaseServerClient()) as unknown as SupabasePatchAuditClient;
  }

  private storedPatch(patch: ProjectPatch, context: PatchExecutionContext) {
    return {
      ...patch,
      id: this.patchId(patch),
      projectId: patch.projectId ?? context.projectId,
      authorUserId: patch.authorUserId ?? context.userId,
      runId: patch.runId ?? context.runId,
    };
  }

  async recordPlannedPatch(input: {
    patch: ProjectPatch;
    context: PatchExecutionContext;
    reason?: string;
    metadata?: Record<string, JsonValue>;
  }): Promise<PlannedPatchRecord> {
    const supabase = await this.client();
    const patchId = this.patchId(input.patch);
    const status = plannedPatchStatus(input.patch);
    const metadata = jsonObject({
      ...(input.patch.metadata ?? {}),
      ...(input.metadata ?? {}),
      plannedBy: plannedWorkflowPatchMarker,
    });
    const storedPatch = this.storedPatch({
      ...input.patch,
      id: patchId,
      metadata,
    }, input.context);

    const result = await supabase
      .from("agent_project_patches")
      .upsert({
        id: patchId,
        owner_id: input.context.userId,
        project_id: input.context.projectId,
        thread_id: nullable(input.context.threadId),
        run_id: nullable(input.context.runId),
        title: input.patch.title,
        summary: input.patch.summary,
        reason: input.reason ?? input.patch.reason ?? null,
        risk_level: input.patch.riskLevel,
        status,
        requires_approval: input.patch.requiresApproval,
        successful_operations: 0,
        failed_operations: 0,
        retryable: false,
        patch: jsonObject(storedPatch),
        metadata,
        updated_at: nowIso(),
        completed_at: null,
      }, { onConflict: "id" });
    assertMutationSucceeded(result, "Unable to record planned patch.");

    return { patchId, status };
  }

  async recordPatchStarted(input: {
    patch: ProjectPatch;
    context: PatchExecutionContext;
  }) {
    const supabase = await this.client();
    const patchId = this.patchId(input.patch);
    const storedPatch = this.storedPatch(input.patch, input.context);

    const result = await supabase
      .from("agent_project_patches")
      .upsert({
        id: patchId,
        owner_id: input.context.userId,
        project_id: input.context.projectId,
        thread_id: nullable(input.context.threadId),
        run_id: nullable(input.context.runId),
        title: input.patch.title,
        summary: input.patch.summary,
        reason: input.patch.reason ?? null,
        risk_level: input.patch.riskLevel,
        status: "applying",
        requires_approval: input.patch.requiresApproval,
        successful_operations: 0,
        failed_operations: 0,
        retryable: false,
        patch: jsonObject(storedPatch),
        metadata: jsonObject(storedPatch.metadata),
        updated_at: nowIso(),
      }, { onConflict: "id" });
    assertMutationSucceeded(result, "Unable to mark patch as applying.");
  }

  async recordPatchCompleted(input: {
    patch: ProjectPatch;
    context: PatchExecutionContext;
    result: ProjectPatchExecutionResult;
  }) {
    const supabase = await this.client();
    const result = await supabase
      .from("agent_project_patches")
      .update({
        status: input.result.status,
        successful_operations: input.result.successfulOperations,
        failed_operations: input.result.failedOperations,
        retryable: input.result.retryable,
        metadata: {
          ...(jsonObject(input.patch.metadata)),
          approvalRequired: input.result.approvalRequired ?? false,
          summary: input.result.summary,
        },
        updated_at: nowIso(),
        completed_at: input.result.status === "awaiting_approval" ? null : nowIso(),
      })
      .eq("id", this.patchId(input.patch));
    assertMutationSucceeded(result, "Unable to record patch completion.");
  }

  async recordOperation(input: {
    patch: ProjectPatch;
    context: PatchExecutionContext;
    operation: ProjectPatchOperationResult;
  }) {
    const supabase = await this.client();
    const result = await supabase
      .from("agent_project_patch_operations")
      .upsert({
        patch_id: this.patchId(input.patch),
        owner_id: input.context.userId,
        project_id: input.context.projectId,
        thread_id: nullable(input.context.threadId),
        run_id: nullable(input.context.runId),
        operation_index: input.operation.operationIndex,
        operation_type: input.operation.type,
        tool_name: input.operation.toolName,
        status: input.operation.status,
        input: jsonObject(input.operation.input),
        output: jsonObject(input.operation.output),
        error: jsonObject(input.operation.error),
        verification: jsonObject(input.operation.verification),
        retryable: input.operation.retryable,
        started_at: input.operation.startedAt ?? null,
        completed_at: input.operation.completedAt ?? null,
      }, { onConflict: "patch_id,operation_index" });
    assertMutationSucceeded(result, "Unable to record patch operation.");
  }
}

function nowIso() {
  return new Date().toISOString();
}

function toolResultMessage(result: ToolExecutionLike, operation: ProjectPatchOperation) {
  if (typeof result.message === "string" && result.message.trim()) {
    return result.message;
  }

  if (result.error?.message) {
    return result.error.message;
  }

  if (result.status === "completed") {
    return `${operation.type} completed.`;
  }

  if (result.status === "awaiting_approval") {
    return `${operation.type} is awaiting approval.`;
  }

  return `${operation.type} did not complete.`;
}

function operationRetryable(result: ToolExecutionLike) {
  if (result.status === "completed" || result.status === "awaiting_approval") {
    return false;
  }

  if (result.status === "blocked") {
    return result.error?.recoverable === true;
  }

  return result.error?.recoverable ?? true;
}

function operationStatus(result: ToolExecutionLike): PatchOperationExecutionStatus {
  return result.status;
}

function finalStatus(operations: ProjectPatchOperationResult[]): PatchExecutionStatus {
  if (operations.some((operation) => operation.status === "awaiting_approval")) {
    return "awaiting_approval";
  }

  const successfulOperations = operations.filter((operation) => operation.status === "completed").length;
  const failedOperations = operations.filter((operation) => operation.status !== "completed").length;

  if (failedOperations === 0) {
    return "completed";
  }

  return successfulOperations > 0 ? "partial_failed" : "failed";
}

function terminalPatchEventType(status: PatchExecutionStatus): RuntimeV4Event["type"] {
  if (status === "completed") {
    return "patch_completed";
  }

  if (status === "partial_failed") {
    return "patch_partial_failed";
  }

  if (status === "awaiting_approval") {
    return "patch_approval_required";
  }

  return "patch_failed";
}

function patchSummary(input: {
  patch: ProjectPatch;
  status: PatchExecutionStatus;
  successfulOperations: number;
  failedOperations: number;
}) {
  if (input.status === "completed") {
    return `Applied ProjectPatch "${input.patch.title}" with ${input.successfulOperations} operation${input.successfulOperations === 1 ? "" : "s"}.`;
  }

  if (input.status === "awaiting_approval") {
    return `ProjectPatch "${input.patch.title}" is awaiting approval.`;
  }

  if (input.status === "partial_failed") {
    return `Applied ${input.successfulOperations} operation${input.successfulOperations === 1 ? "" : "s"} from ProjectPatch "${input.patch.title}", but ${input.failedOperations} operation${input.failedOperations === 1 ? "" : "s"} failed.`;
  }

  return `ProjectPatch "${input.patch.title}" failed before any operation completed.`;
}

export class PatchExecutor {
  private readonly toolExecutor: ToolExecutorLike;
  private readonly auditStore?: PatchAuditStore;
  private readonly requireAudit: boolean;

  constructor(options: PatchExecutorOptions) {
    this.toolExecutor = options.toolExecutor;
    this.auditStore = options.auditStore;
    this.requireAudit = options.requireAudit ?? false;
  }

  private async audit(callback: (() => Promise<void> | void) | undefined) {
    if (!callback) {
      return;
    }

    if (this.requireAudit) {
      await Promise.resolve(callback());
      return;
    }

    await Promise.resolve(callback()).catch(() => undefined);
  }

  async apply(input: {
    patch: ProjectPatch;
    context: PatchExecutionContext;
    force?: boolean;
  }): Promise<ProjectPatchExecutionResult> {
    const events: RuntimeV4Event[] = [];
    let patch: ProjectPatch;

    try {
      patch = projectPatchSchema.parse(input.patch);
    } catch (caught) {
      const error = errorFromUnknown(
        caught instanceof ZodError
          ? new ProjectPatchValidationError(caught.message, caught)
          : caught,
        "PROJECT_PATCH_INVALID",
      );
      const failedPatch = input.patch;
      events.push({
        type: "patch_failed",
        runId: input.context.runId,
        threadId: input.context.threadId ?? null,
        patch: failedPatch,
        message: error.message,
        error: error.message,
      });

      return {
        status: "failed",
        patch: failedPatch,
        operations: [],
        summary: error.message,
        successfulOperations: 0,
        failedOperations: 0,
        retryable: error.recoverable ?? true,
        error,
        events,
      };
    }

    events.push({
      type: "patch_planned",
      runId: input.context.runId,
      threadId: input.context.threadId ?? null,
      patch,
      patchStatus: "planned",
      message: patch.summary,
    });

    if (patch.requiresApproval || patch.riskLevel === "blocked") {
      const summary = `ProjectPatch "${patch.title}" requires approval before applying.`;
      events.push({
        type: "patch_approval_required",
        runId: input.context.runId,
        threadId: input.context.threadId ?? null,
        patch,
        patchStatus: "awaiting_approval",
        message: summary,
      });

      const result: ProjectPatchExecutionResult = {
        status: "awaiting_approval",
        patch,
        operations: [],
        summary,
        successfulOperations: 0,
        failedOperations: 0,
        retryable: false,
        approvalRequired: true,
        events,
      };

      await this.audit(() => this.auditStore?.recordPatchStarted?.({
        patch,
        context: input.context,
      }));
      await this.audit(() => this.auditStore?.recordPatchCompleted?.({
        patch,
        context: input.context,
        result,
      }));

      return result;
    }

    await this.audit(() => this.auditStore?.recordPatchStarted?.({
      patch,
      context: input.context,
    }));

    events.push({
      type: "patch_applying",
      runId: input.context.runId,
      threadId: input.context.threadId ?? null,
      patch,
      patchStatus: "applying",
      message: `Applying ProjectPatch "${patch.title}".`,
    });

    const operations: ProjectPatchOperationResult[] = [];

    for (const [operationIndex, operation] of patch.operations.entries()) {
      const toolName = mapProjectPatchOperationToToolName(operation);
      if (operation.requiresApproval && !input.force) {
        const operationResult: ProjectPatchOperationResult = {
          operationIndex,
          operation,
          type: operation.type,
          toolName,
          input: operation.input,
          status: "awaiting_approval",
          retryable: false,
          message: `${operation.type} requires approval before applying.`,
        };

        operations.push(operationResult);
        await this.audit(() => this.auditStore?.recordOperation?.({
          patch,
          context: input.context,
          operation: operationResult,
        }));

        events.push({
          type: "patch_operation_awaiting_approval",
          runId: input.context.runId,
          threadId: input.context.threadId ?? null,
          patch,
          operationIndex,
          operationType: operation.type,
          toolName,
          operationStatus: operationResult.status,
          message: operationResult.message,
        });
        break;
      }

      events.push({
        type: "patch_operation_running",
        runId: input.context.runId,
        threadId: input.context.threadId ?? null,
        patch,
        operationIndex,
        operationType: operation.type,
        toolName,
        operationStatus: "running",
        message: `Running ${operation.type}.`,
      });

      const operationStartedAt = nowIso();
      await this.audit(() => this.auditStore?.recordOperation?.({
        patch,
        context: input.context,
        operation: {
          operationIndex,
          operation,
          type: operation.type,
          toolName,
          input: operation.input,
          status: "running",
          retryable: false,
          message: `Running ${operation.type}.`,
          startedAt: operationStartedAt,
        },
      }));

      let toolResult: ToolExecutionLike;
      try {
        toolResult = await this.toolExecutor.execute({
          toolName,
          input: operation.input,
          context: input.context,
        });
      } catch (caught) {
        const completedAt = nowIso();
        const error = errorFromUnknown(caught, "PROJECT_PATCH_OPERATION_FAILED");
        toolResult = {
          toolName,
          status: "failed",
          error,
          startedAt: completedAt,
          completedAt,
        };
      }

      const operationResult: ProjectPatchOperationResult = {
        operationIndex,
        operation,
        type: operation.type,
        toolName,
        input: operation.input,
        status: operationStatus(toolResult),
        retryable: operationRetryable(toolResult),
        message: toolResultMessage(toolResult, operation),
        output: toolResult.output,
        error: toolResult.error,
        verification: toolResult.verification,
        toolCallId: toolResult.toolCallId,
        startedAt: toolResult.startedAt ?? operationStartedAt,
        completedAt: toolResult.completedAt,
        toolResult,
      };

      operations.push(operationResult);
      await this.audit(() => this.auditStore?.recordOperation?.({
        patch,
        context: input.context,
        operation: operationResult,
      }));

      const verificationEvent = toolVerificationEvent({
        result: toolResult,
        runId: input.context.runId,
        threadId: input.context.threadId ?? null,
        operationIndex,
        operationType: operation.type,
      });
      if (verificationEvent) {
        events.push(verificationEvent);
      }

      if (operationResult.status === "completed") {
        events.push({
          type: "patch_operation_completed",
          runId: input.context.runId,
          threadId: input.context.threadId ?? null,
          patch,
          operationIndex,
          operationType: operation.type,
          toolName,
          toolCallId: operationResult.toolCallId,
          operationStatus: operationResult.status,
          message: operationResult.message,
        });
        continue;
      }

      events.push({
        type: operationResult.status === "awaiting_approval"
          ? "patch_operation_awaiting_approval"
          : "patch_operation_failed",
        runId: input.context.runId,
        threadId: input.context.threadId ?? null,
        patch,
        operationIndex,
        operationType: operation.type,
        toolName,
        toolCallId: operationResult.toolCallId,
        operationStatus: operationResult.status,
        message: operationResult.message,
        error: operationResult.error?.message ?? operationResult.message,
      });
      break;
    }

    const status = finalStatus(operations);
    const successfulOperations = operations.filter((operation) => operation.status === "completed").length;
    const failedOperations = operations.filter((operation) =>
      operation.status === "failed" || operation.status === "blocked",
    ).length;
    const retryable = status === "completed" || status === "awaiting_approval"
      ? false
      : operations.some((operation) => operation.retryable);
    const summary = patchSummary({
      patch,
      status,
      successfulOperations,
      failedOperations,
    });

    const result: ProjectPatchExecutionResult = {
      status,
      patch,
      operations,
      summary,
      successfulOperations,
      failedOperations,
      retryable,
      approvalRequired: status === "awaiting_approval",
      events,
    };

    events.push({
      type: terminalPatchEventType(status),
      runId: input.context.runId,
      threadId: input.context.threadId ?? null,
      patch,
      patchStatus: status,
      message: summary,
      error: status === "completed" || status === "awaiting_approval" ? undefined : summary,
    });

    await this.audit(() => this.auditStore?.recordPatchCompleted?.({
      patch,
      context: input.context,
      result,
    }));

    return result;
  }
}
