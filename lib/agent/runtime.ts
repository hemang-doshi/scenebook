/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AgentHistory,
  AgentMessageRecord,
  AgentMessageRole,
  AgentModelsSelection,
  AgentRunRecord,
  AgentToolCallStatus,
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

function deriveThreadTitleFromMessage(content: string) {
  const trimmed = content
    .trim()
    .replace(/^\/[^\s]+\s*/, "")
    .replace(/\s+/g, " ");

  if (!trimmed) {
    return "Untitled thread";
  }

  return trimmed.slice(0, 72);
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

export async function getAgentHistory(projectId: string, threadId?: string): Promise<AgentHistory> {
  const { supabase, user } = await requireUser();
  let thread: AgentThreadRecord | null = null;

  if (threadId) {
    const { data, error } = await supabase
      .from("agent_threads")
      .select("*")
      .eq("owner_id", user.id)
      .eq("project_id", projectId)
      .eq("id", threadId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    thread = data as AgentThreadRecord | null;
  } else {
    const { data, error } = await supabase
      .from("agent_threads")
      .select("*")
      .eq("owner_id", user.id)
      .eq("project_id", projectId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }
    thread = ((data as AgentThreadRecord[] | null) ?? [])[0] ?? null;
  }

  if (!thread) {
    return {
      thread: null,
      messages: [],
      toolCalls: [],
    };
  }

  const { data: messages, error: messagesError } = await supabase
    .from("agent_messages")
    .select("*")
    .eq("owner_id", user.id)
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    throw messagesError;
  }

  const { data: toolCalls, error: toolCallsError } = await supabase
    .from("agent_tool_calls")
    .select("*")
    .eq("owner_id", user.id)
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true });

  if (toolCallsError) {
    throw toolCallsError;
  }

  return {
    thread: thread as AgentThreadRecord,
    messages: (messages ?? []) as AgentMessageRecord[],
    toolCalls: (toolCalls ?? []) as AgentToolCallRecord[],
  };
}

export async function getLatestAgentHistory(projectId: string): Promise<AgentHistory> {
  return getAgentHistory(projectId);
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
    .update({
      updated_at: new Date().toISOString(),
      ...(input.role === "user" ? { title: deriveThreadTitleFromMessage(input.content) } : {}),
    })
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
  status?: AgentToolCallStatus;
  requiresApproval: boolean;
  payload: Record<string, JsonValue>;
}) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("agent_tool_calls")
    .insert({
      owner_id: user.id,
      run_id: input.runId,
      thread_id: input.threadId,
      project_id: input.projectId,
      tool_name: input.toolName,
      command: input.command ?? null,
      status: input.status ?? "running",
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

export async function getAgentToolCall(toolCallId: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("agent_tool_calls")
    .select("*")
    .eq("id", toolCallId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Tool call not found.");
  }

  return data as AgentToolCallRecord;
}

export async function completeAgentToolCall(
  toolCallId: string,
  output: Record<string, JsonValue>,
  status: string,
) {
  const { supabase } = await requireUser();
  const payload: Record<string, JsonValue> = {
    output,
    status,
  };

  if (status === "completed" || status === "failed" || status === "rejected") {
    payload.completed_at = new Date().toISOString();
  }

  if (status === "approved" || status === "completed") {
    payload.approved_at = new Date().toISOString();
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

export async function listAgentThreads(projectId: string): Promise<AgentThreadRecord[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("agent_threads")
    .select("*")
    .eq("owner_id", user.id)
    .eq("project_id", projectId)
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as AgentThreadRecord[];
}
