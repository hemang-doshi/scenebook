/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CreativeBriefState } from "@/lib/agent/runtime-v3/types";

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

export async function loadCreativeBrief(projectId: string): Promise<CreativeBriefState | null> {
  try {
    const supabase = (await createSupabaseServerClient()) as any;
    const { data, error } = await supabase
      .from("project_creative_briefs")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapCreativeBrief(data);
  } catch {
    return null;
  }
}

export async function upsertCreativeBrief(input: {
  ownerId: string;
  projectId: string;
  patch: CreativeBriefState;
}): Promise<CreativeBriefState> {
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
    .from("project_creative_briefs")
    .upsert(cleaned, { onConflict: "project_id" })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to update creative brief.");
  }

  return mapCreativeBrief(data);
}
