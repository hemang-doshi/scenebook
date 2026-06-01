import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  PatchExecutor,
  SupabasePatchAuditStore,
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
  patch: unknown;
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

function patchForApply(row: StoredPatchRow): ProjectPatch {
  const patch = projectPatchSchema.parse(row.patch);

  return {
    ...patch,
    id: patch.id ?? row.id,
    projectId: patch.projectId ?? row.project_id,
    authorUserId: patch.authorUserId ?? row.owner_id,
    runId: patch.runId ?? row.run_id ?? undefined,
  };
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
    .select("id, owner_id, project_id, thread_id, run_id, patch")
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

    const patch = patchForApply(patchRow);
    const toolExecutor = new ToolExecutor({
      registry: createRuntimeV4ToolRegistry(),
    });
    const patchExecutor = new PatchExecutor({
      toolExecutor,
      auditStore: new SupabasePatchAuditStore(),
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
    return NextResponse.json(
      {
        error: caught instanceof ZodError
          ? "Stored patch is invalid."
          : caught instanceof Error
            ? caught.message
            : "Unable to apply planned patch.",
      },
      { status: 400 },
    );
  }
}
