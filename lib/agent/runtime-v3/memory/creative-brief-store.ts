/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CreativeBriefState } from "@/lib/agent/runtime-v3/types";

const creativeBriefTable = "project_creative_briefs";

type CreativeBriefStoreOperation = "select" | "upsert" | "verify_update";

type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export type CreativeBriefStoreErrorMetadata = {
  code?: string | null;
  message: string;
  details?: string | null;
  hint?: string | null;
  table: typeof creativeBriefTable;
  operation: CreativeBriefStoreOperation;
  projectId: string;
  recoverable: boolean;
};

export class CreativeBriefStoreError extends Error {
  metadata: CreativeBriefStoreErrorMetadata;

  constructor(metadata: CreativeBriefStoreErrorMetadata) {
    super(metadata.message);
    this.name = "CreativeBriefStoreError";
    this.metadata = metadata;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSupabaseErrorLike(value: unknown): value is SupabaseErrorLike {
  return isRecord(value)
    && ("message" in value || "code" in value || "details" in value || "hint" in value);
}

function isRecoverableSupabaseError(code?: string | null) {
  if (!code) {
    return false;
  }

  return code.startsWith("08")
    || code === "40001"
    || code === "40P01"
    || code === "53300"
    || code === "57014";
}

function creativeBriefError(input: {
  caught: unknown;
  projectId: string;
  operation: CreativeBriefStoreOperation;
  fallbackMessage: string;
}) {
  if (input.caught instanceof CreativeBriefStoreError) {
    return input.caught;
  }

  const source = isSupabaseErrorLike(input.caught) ? input.caught : null;
  const message = source?.message
    ?? (input.caught instanceof Error ? input.caught.message : null)
    ?? input.fallbackMessage;

  return new CreativeBriefStoreError({
    code: source?.code ?? null,
    message,
    details: source?.details ?? null,
    hint: source?.hint ?? null,
    table: creativeBriefTable,
    operation: input.operation,
    projectId: input.projectId,
    recoverable: source ? isRecoverableSupabaseError(source.code) : false,
  });
}

function mapCreativeBrief(row: any): CreativeBriefState {
  return {
    audience: row.audience ?? undefined,
    platform: row.platform ?? undefined,
    format: row.format ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    tone: row.tone ?? undefined,
    coreAngle: row.core_angle ?? undefined,
    viewerPromise: row.viewer_promise ?? undefined,
    viewerEmotion: row.viewer_emotion ?? undefined,
    creatorPersona: row.creator_persona ?? undefined,
    visualStyle: row.visual_style ?? undefined,
    cta: row.cta ?? undefined,
    constraints: row.constraints ?? [],
    assumptions: row.assumptions ?? [],
    rejectedDirections: row.rejected_directions ?? [],
    openQuestions: row.open_questions ?? [],
    approvedFields: row.approved_fields ?? [],
  };
}

export async function loadCreativeBrief(
  projectId: string,
  options: { throwOnError?: boolean; operation?: CreativeBriefStoreOperation } = {},
): Promise<CreativeBriefState | null> {
  const operation = options.operation ?? "select";
  try {
    const supabase = (await createSupabaseServerClient()) as any;
    const { data, error } = await supabase
      .from(creativeBriefTable)
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    if (error) {
      if (options.throwOnError) {
        throw creativeBriefError({
          caught: error,
          projectId,
          operation,
          fallbackMessage: "Unable to read creative brief.",
        });
      }
      return null;
    }

    if (!data) {
      return null;
    }

    return mapCreativeBrief(data);
  } catch (caught) {
    if (options.throwOnError) {
      throw creativeBriefError({
        caught,
        projectId,
        operation,
        fallbackMessage: "Unable to read creative brief.",
      });
    }
    return null;
  }
}

export async function upsertCreativeBrief(input: {
  ownerId: string;
  projectId: string;
  patch: CreativeBriefState;
}): Promise<CreativeBriefState> {
  try {
    const supabase = (await createSupabaseServerClient()) as any;
    const payload = {
      owner_id: input.ownerId,
      project_id: input.projectId,
      audience: input.patch.audience,
      platform: input.patch.platform,
      format: input.patch.format,
      duration_seconds: input.patch.durationSeconds,
      tone: input.patch.tone,
      core_angle: input.patch.coreAngle,
      viewer_promise: input.patch.viewerPromise,
      viewer_emotion: input.patch.viewerEmotion,
      creator_persona: input.patch.creatorPersona,
      visual_style: input.patch.visualStyle,
      cta: input.patch.cta,
      constraints: input.patch.constraints,
      assumptions: input.patch.assumptions,
      rejected_directions: input.patch.rejectedDirections,
      open_questions: input.patch.openQuestions,
      approved_fields: input.patch.approvedFields,
      updated_at: new Date().toISOString(),
    };
    const cleaned = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
    const { data, error } = await supabase
      .from(creativeBriefTable)
      .upsert(cleaned, { onConflict: "project_id" })
      .select("*")
      .single();

    if (error) {
      throw creativeBriefError({
        caught: error,
        projectId: input.projectId,
        operation: "upsert",
        fallbackMessage: "Unable to write creative brief.",
      });
    }

    if (!data) {
      throw new CreativeBriefStoreError({
        code: null,
        message: "Creative brief upsert returned no row.",
        details: null,
        hint: null,
        table: creativeBriefTable,
        operation: "upsert",
        projectId: input.projectId,
        recoverable: true,
      });
    }

    return mapCreativeBrief(data);
  } catch (caught) {
    throw creativeBriefError({
      caught,
      projectId: input.projectId,
      operation: "upsert",
      fallbackMessage: "Unable to write creative brief.",
    });
  }
}
