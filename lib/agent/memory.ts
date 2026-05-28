/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JsonValue } from "@/lib/types";

type AgentSnapshotInput = {
  projectId: string;
  threadId: string;
  summary: string;
  decisions?: JsonValue[];
  openQuestions?: JsonValue[];
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

export async function createMemorySnapshot(input: AgentSnapshotInput) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("agent_memory_snapshots")
    .insert({
      owner_id: user.id,
      thread_id: input.threadId,
      project_id: input.projectId,
      summary: input.summary,
      decisions: input.decisions ?? [],
      open_questions: input.openQuestions ?? [],
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create agent memory snapshot.");
  }

  return data;
}

export async function listMemorySnapshots(threadId: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("agent_memory_snapshots")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getLatestProjectMemory(projectId: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("agent_memory_snapshots")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

