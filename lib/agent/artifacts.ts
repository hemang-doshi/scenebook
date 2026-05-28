/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JsonValue } from "@/lib/types";

type ProjectArtifactInput = {
  projectId: string;
  threadId: string;
  toolCallId: string;
  artifactType: string;
  title: string;
  payload: Record<string, JsonValue>;
  metadata?: Record<string, JsonValue>;
};

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  return { supabase: supabase as any, user };
}

export async function createProjectArtifact(input: ProjectArtifactInput) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("project_artifacts")
    .insert({
      owner_id: user.id,
      project_id: input.projectId,
      thread_id: input.threadId,
      tool_call_id: input.toolCallId,
      artifact_type: input.artifactType,
      title: input.title,
      payload: input.payload,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create project artifact.");
  }

  return data;
}
