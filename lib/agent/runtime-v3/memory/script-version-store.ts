/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JsonValue } from "@/lib/types";

export type ScriptVersionRecord = {
  id: string;
  title: string;
  active: boolean;
  scriptLab: Record<string, JsonValue>;
  metadata: Record<string, JsonValue>;
  createdAt?: string;
};

function mapScriptVersion(row: any): ScriptVersionRecord {
  return {
    id: row.id,
    title: row.title,
    active: Boolean(row.active),
    scriptLab: row.script_lab ?? {},
    metadata: row.metadata ?? {},
    createdAt: row.created_at ?? undefined,
  };
}

export async function createScriptVersion(input: {
  ownerId: string;
  projectId: string;
  threadId: string;
  toolCallId?: string | null;
  title: string;
  scriptLab: Record<string, JsonValue>;
  active: boolean;
  metadata?: Record<string, JsonValue>;
}): Promise<ScriptVersionRecord> {
  const supabase = (await createSupabaseServerClient()) as any;

  if (input.active) {
    const { error } = await supabase
      .from("script_versions")
      .update({ active: false })
      .eq("owner_id", input.ownerId)
      .eq("project_id", input.projectId)
      .eq("active", true);

    if (error) {
      throw error;
    }
  }

  const { data, error } = await supabase
    .from("script_versions")
    .insert({
      owner_id: input.ownerId,
      project_id: input.projectId,
      thread_id: input.threadId,
      tool_call_id: input.toolCallId ?? null,
      title: input.title,
      script_lab: input.scriptLab,
      active: input.active,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create script version.");
  }

  return mapScriptVersion(data);
}

export async function loadScriptVersion(input: {
  projectId: string;
  versionId: string;
}): Promise<ScriptVersionRecord | null> {
  const supabase = (await createSupabaseServerClient()) as any;
  const { data, error } = await supabase
    .from("script_versions")
    .select("*")
    .eq("project_id", input.projectId)
    .eq("id", input.versionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapScriptVersion(data);
}
