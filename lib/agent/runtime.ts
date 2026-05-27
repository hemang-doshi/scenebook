/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AgentMessageRecord,
  AgentMessageRole,
  AgentModelsSelection,
  AgentRunRecord,
  AgentThreadRecord,
  AgentToolCallRecord,
} from "@/lib/agent/types";
import type { JsonValue } from "@/lib/types";

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

export async function createOrLoadThread(projectId: string, threadId?: string) {
  const { supabase, user } = await requireUser();

  if (threadId) {
    const { data, error } = await supabase
      .from("agent_threads")
      .select("*")
      .eq("id", threadId)
      .eq("owner_id", user.id)
      .eq("project_id", projectId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data as AgentThreadRecord;
    }
  }

  const { data, error } = await supabase
    .from("agent_threads")
    .insert({
      owner_id: user.id,
      project_id: projectId,
      title: "Untitled thread",
      status: "active",
      metadata: {},
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create agent thread.");
  }

  return data as AgentThreadRecord;
}

export async function appendAgentMessage(input: {
  projectId: string;
  threadId: string;
  role: AgentMessageRole;
  content: string;
  model?: string | null;
  provider?: string | null;
  metadata?: Record<string, JsonValue>;
}) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("agent_messages")
    .insert({
      owner_id: user.id,
      thread_id: input.threadId,
      project_id: input.projectId,
      role: input.role,
      content: input.content,
      model: input.model ?? null,
      provider: input.provider ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to append agent message.");
  }

  await supabase
    .from("agent_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.threadId)
    .eq("owner_id", user.id);

  return data as AgentMessageRecord;
}

export async function createAgentRun(input: {
  projectId: string;
  threadId: string;
  input: string;
  selectedModels?: AgentModelsSelection;
  metadata?: Record<string, JsonValue>;
}) {
  const { supabase, user } = await requireUser();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("agent_runs")
    .insert({
      owner_id: user.id,
      thread_id: input.threadId,
      project_id: input.projectId,
      status: "running",
      input: input.input,
      selected_models: input.selectedModels ?? {},
      metadata: input.metadata ?? {},
      started_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create agent run.");
  }

  return data as AgentRunRecord;
}

export async function completeAgentRun(runId: string, metadata?: Record<string, JsonValue>) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("agent_runs")
    .update({
      status: "completed",
      metadata: metadata ?? {},
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) {
    throw error;
  }
}

export async function failAgentRun(
  runId: string,
  errorMessage: string,
  metadata?: Record<string, JsonValue>,
) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("agent_runs")
    .update({
      status: "failed",
      error_message: errorMessage,
      metadata: metadata ?? {},
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) {
    throw error;
  }
}

export async function createAgentToolCall(input: {
  projectId: string;
  threadId: string;
  runId: string;
  toolName: string;
  command?: string | null;
  requiresApproval: boolean;
  payload: Record<string, JsonValue>;
}) {
  const { supabase, user } = await requireUser();
  const status = input.requiresApproval ? "awaiting_approval" : "running";
  const { data, error } = await supabase
    .from("agent_tool_calls")
    .insert({
      owner_id: user.id,
      run_id: input.runId,
      thread_id: input.threadId,
      project_id: input.projectId,
      tool_name: input.toolName,
      command: input.command ?? null,
      status,
      input: input.payload,
      output: {},
      requires_approval: input.requiresApproval,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create agent tool call.");
  }

  return data as AgentToolCallRecord;
}

export async function completeAgentToolCall(
  toolCallId: string,
  output: Record<string, JsonValue>,
  requiresApproval: boolean,
) {
  const { supabase } = await requireUser();
  const payload: Record<string, JsonValue> = {
    output,
    status: requiresApproval ? "awaiting_approval" : "completed",
  };

  if (!requiresApproval) {
    payload.completed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("agent_tool_calls").update(payload).eq("id", toolCallId);

  if (error) {
    throw error;
  }
}

export async function failAgentToolCall(toolCallId: string, errorMessage: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("agent_tool_calls")
    .update({
      status: "failed",
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("id", toolCallId);

  if (error) {
    throw error;
  }
}
