import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  plannedWorkflowPatchMarker,
  PatchExecutor,
  SupabasePatchAuditStore,
  SupabasePatchAuditError,
} from "@/lib/agent/runtime-v4/patch/patch-executor";
import { projectPatchSchema, type ProjectPatch } from "@/lib/agent/runtime-v4/patch/project-patch";
import { ToolExecutor } from "@/lib/agent/runtime-v4/tools/executor";
import { createRuntimeV4ToolRegistry } from "@/lib/agent/runtime-v4/tools/registry";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseUser = {
  id: string;
};

type StoredPatchRow = {
  id: string;
  owner_id: string;
  project_id: string;
  thread_id: string | null;
  run_id: string | null;
  status: string;
  patch: unknown;
  metadata: unknown;
};

type SupabaseSelectChain<T> = {
  eq(column: string, value: string): SupabaseSelectChain<T>;
  maybeSingle(): PromiseLike<{ data: T | null; error: Error | null }>;
};

type ApplyPatchSupabaseClient = {
  auth: {
    getUser(): PromiseLike<{ data: { user: SupabaseUser | null } }>;
  };
  from(table: string): {
    select(columns: string): SupabaseSelectChain<Record<string, unknown>>;
  };
};

const applicablePatchStatuses = new Set(["planned", "awaiting_approval"]);

class PatchApplyEligibilityError extends Error {
  status: number;

  constructor(message: string, status = 409) {
    super(message);
    this.name = "PatchApplyEligibilityError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function applyContext(input: {
  userId: string;
  projectId: string;
  row: StoredPatchRow;
}) {
  return {
    userId: input.userId,
    projectId: input.projectId,
    threadId: input.row.thread_id ?? undefined,
    runId: input.row.run_id ?? undefined,
    source: "agent_patch_apply",
  };
}

function assertOptionalMatch(input: {
  label: string;
  value: string | undefined;
  expected: string | undefined;
}) {
  if (input.value !== undefined && input.value !== input.expected) {
    throw new PatchApplyEligibilityError(`${input.label} does not match the stored patch row.`);
  }
}

function patchForApply(input: {
  row: StoredPatchRow;
  projectId: string;
  userId: string;
  patchId: string;
}): ProjectPatch {
  const { row } = input;
  if (!applicablePatchStatuses.has(row.status)) {
    throw new PatchApplyEligibilityError("Only planned or awaiting approval patches can be applied.");
  }

  const metadata = isRecord(row.metadata) ? row.metadata : {};
  if (metadata.plannedBy !== plannedWorkflowPatchMarker) {
    throw new PatchApplyEligibilityError("Patch was not planned by the runtime-v4 workflow engine.");
  }

  const patch = projectPatchSchema.parse(row.patch);

  assertOptionalMatch({
    label: "Patch id",
    value: patch.id,
    expected: row.id,
  });
  assertOptionalMatch({
    label: "Patch project id",
    value: patch.projectId,
    expected: row.project_id,
  });
  assertOptionalMatch({
    label: "Patch author user id",
    value: patch.authorUserId,
    expected: row.owner_id,
  });
  assertOptionalMatch({
    label: "Patch run id",
    value: patch.runId,
    expected: row.run_id ?? undefined,
  });

  if (row.id !== input.patchId || row.project_id !== input.projectId || row.owner_id !== input.userId) {
    throw new PatchApplyEligibilityError("Patch row does not match the apply request.");
  }

  return projectPatchSchema.parse({
    ...patch,
    id: row.id,
    projectId: row.project_id,
    authorUserId: row.owner_id,
    runId: row.run_id ?? undefined,
  });
}

function operationResponse(result: Awaited<ReturnType<PatchExecutor["apply"]>>) {
  return result.operations.map((operation) => ({
    operationIndex: operation.operationIndex,
    type: operation.type,
    toolName: operation.toolName,
    status: operation.status,
    message: operation.message,
    retryable: operation.retryable,
    error: operation.error ?? null,
    verification: operation.verification ?? null,
    output: operation.output ?? null,
  }));
}

async function requireOwnedProject(input: {
  supabase: ApplyPatchSupabaseClient;
  projectId: string;
  userId: string;
}) {
  const { data, error } = await input.supabase
    .from("content_cards")
    .select("id")
    .eq("id", input.projectId)
    .eq("owner_id", input.userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function loadOwnedPatch(input: {
  supabase: ApplyPatchSupabaseClient;
  patchId: string;
  projectId: string;
  userId: string;
}) {
  const { data, error } = await input.supabase
    .from("agent_project_patches")
    .select("id, owner_id, project_id, thread_id, run_id, status, patch, metadata")
    .eq("id", input.patchId)
    .eq("project_id", input.projectId)
    .eq("owner_id", input.userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as StoredPatchRow | null;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; patchId: string }> },
) {
  try {
    const supabase = (await createSupabaseServerClient()) as unknown as ApplyPatchSupabaseClient;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const { id: projectId, patchId } = await params;
    const ownsProject = await requireOwnedProject({
      supabase,
      projectId,
      userId: user.id,
    });

    if (!ownsProject) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const patchRow = await loadOwnedPatch({
      supabase,
      patchId,
      projectId,
      userId: user.id,
    });

    if (!patchRow) {
      return NextResponse.json({ error: "Patch not found." }, { status: 404 });
    }

    const patch = patchForApply({
      row: patchRow,
      projectId,
      userId: user.id,
      patchId,
    });
    const toolExecutor = new ToolExecutor({
      registry: createRuntimeV4ToolRegistry(),
    });
    const patchExecutor = new PatchExecutor({
      toolExecutor,
      auditStore: new SupabasePatchAuditStore(),
      requireAudit: true,
    });
    const result = await patchExecutor.apply({
      patch,
      context: applyContext({
        userId: user.id,
        projectId,
        row: patchRow,
      }),
    });

    return NextResponse.json({
      patchId: patchRow.id,
      status: result.status,
      summary: result.summary,
      successfulOperations: result.successfulOperations,
      failedOperations: result.failedOperations,
      retryable: result.retryable,
      approvalRequired: result.approvalRequired ?? false,
      operations: operationResponse(result),
    });
  } catch (caught) {
    const status = caught instanceof PatchApplyEligibilityError
      ? caught.status
      : caught instanceof ZodError
        ? 400
        : caught instanceof SupabasePatchAuditError
          ? 500
          : 500;

    return NextResponse.json(
      {
        error: caught instanceof ZodError
          ? "Stored patch is invalid."
          : caught instanceof Error
            ? caught.message
            : "Unable to apply planned patch.",
      },
      { status },
    );
  }
}
